-- PostgreSQL 17 reference schema for a single-store MVP.
-- Design baseline, not a deployed migration. Run integration tests before production.
-- Monetary values: BIGINT satang. All timestamps: TIMESTAMPTZ.


CREATE TABLE store (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL,
 timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok', currency CHAR(3) NOT NULL DEFAULT 'THB' CHECK(currency='THB'),
 accepting_orders BOOLEAN NOT NULL DEFAULT false, hours JSONB NOT NULL DEFAULT '{}',
 packaging_fee_satang BIGINT NOT NULL DEFAULT 500 CHECK(packaging_fee_satang>=0),
 catalog_version BIGINT NOT NULL DEFAULT 1, vat_registered BOOLEAN NOT NULL DEFAULT false,
 vat_rate_bps INTEGER NOT NULL DEFAULT 0 CHECK(vat_rate_bps BETWEEN 0 AND 10000),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE app_user (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), kind TEXT NOT NULL CHECK(kind IN ('GUEST','CUSTOMER','STAFF')),
 line_subject TEXT UNIQUE, username TEXT UNIQUE, display_name TEXT,
 phone_ciphertext TEXT, password_hash TEXT, totp_secret_ciphertext TEXT,
 active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(kind<>'STAFF' OR (username IS NOT NULL AND password_hash IS NOT NULL AND totp_secret_ciphertext IS NOT NULL))
);
CREATE TABLE staff_role (
 user_id UUID NOT NULL REFERENCES app_user(id), store_id UUID NOT NULL REFERENCES store(id),
 role TEXT NOT NULL CHECK(role IN ('CASHIER','KITCHEN','MANAGER','OWNER')),
 PRIMARY KEY(user_id,store_id,role)
);
CREATE TABLE auth_session (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES app_user(id),
 token_hash TEXT NOT NULL UNIQUE, csrf_hash TEXT NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL, absolute_expires_at TIMESTAMPTZ NOT NULL,
 last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(expires_at<=absolute_expires_at)
);
CREATE INDEX auth_session_expiry ON auth_session(expires_at);
CREATE TABLE dining_table (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), store_id UUID NOT NULL REFERENCES store(id),
 code TEXT NOT NULL, qr_token_hash TEXT NOT NULL UNIQUE, active BOOLEAN NOT NULL DEFAULT true,
 UNIQUE(store_id,code)
);
CREATE TABLE table_visit (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), table_id UUID NOT NULL REFERENCES dining_table(id),
 join_pin_hash TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('OPEN','CLOSED','EXPIRED')),
 expires_at TIMESTAMPTZ NOT NULL, opened_by UUID NOT NULL REFERENCES app_user(id),
 closed_at TIMESTAMPTZ, version BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_open_visit_per_table ON table_visit(table_id) WHERE status='OPEN';
CREATE TABLE table_visit_member (
 visit_id UUID NOT NULL REFERENCES table_visit(id), user_id UUID NOT NULL REFERENCES app_user(id),
 joined_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(visit_id,user_id)
);
CREATE TABLE category (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), store_id UUID NOT NULL REFERENCES store(id),
 name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE product (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), category_id UUID NOT NULL REFERENCES category(id),
 name TEXT NOT NULL, description TEXT, price_satang BIGINT NOT NULL CHECK(price_satang>=0),
 station TEXT NOT NULL CHECK(station IN ('FOOD','DRINK')), image_url TEXT,
 active BOOLEAN NOT NULL DEFAULT true, sold_out BOOLEAN NOT NULL DEFAULT false,
 version BIGINT NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE option_group (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), store_id UUID NOT NULL REFERENCES store(id),
 name TEXT NOT NULL, min_select INTEGER NOT NULL CHECK(min_select>=0),
 max_select INTEGER NOT NULL CHECK(max_select>=min_select)
);
CREATE TABLE option_choice (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), group_id UUID NOT NULL REFERENCES option_group(id),
 label TEXT NOT NULL, price_delta_satang BIGINT NOT NULL DEFAULT 0 CHECK(price_delta_satang>=0),
 active BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE product_option_group (
 product_id UUID NOT NULL REFERENCES product(id), group_id UUID NOT NULL REFERENCES option_group(id),
 PRIMARY KEY(product_id,group_id)
);
CREATE TABLE inventory_stock (
 product_id UUID PRIMARY KEY REFERENCES product(id), available_qty INTEGER CHECK(available_qty>=0),
 version BIGINT NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE quote (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID NOT NULL REFERENCES app_user(id),
 store_id UUID NOT NULL REFERENCES store(id), visit_id UUID REFERENCES table_visit(id),
 mode TEXT NOT NULL CHECK(mode IN ('DINE_IN','TAKEAWAY')),
 request JSONB NOT NULL, calculated JSONB NOT NULL, catalog_version BIGINT NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((mode='DINE_IN' AND visit_id IS NOT NULL) OR (mode='TAKEAWAY' AND visit_id IS NULL))
);
CREATE SEQUENCE order_code_seq START WITH 1000;
CREATE TABLE orders (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 code TEXT NOT NULL UNIQUE, -- service: sequence -> Q + at least 6 digits; never truncate
 customer_id UUID NOT NULL REFERENCES app_user(id), store_id UUID NOT NULL REFERENCES store(id),
 quote_id UUID NOT NULL UNIQUE REFERENCES quote(id), visit_id UUID REFERENCES table_visit(id),
 mode TEXT NOT NULL CHECK(mode IN ('DINE_IN','TAKEAWAY')),
 status TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT' CHECK(status IN
 ('AWAITING_PAYMENT','QUEUED','PREPARING','READY','COMPLETED','CANCELLED','EXPIRED','ON_HOLD')),
 payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN
 ('UNPAID','PENDING','PAID','PARTIALLY_REFUNDED','REFUNDED','REVIEW')),
 subtotal_satang BIGINT NOT NULL CHECK(subtotal_satang>=0),
 packaging_fee_satang BIGINT NOT NULL CHECK(packaging_fee_satang>=0),
 total_satang BIGINT NOT NULL CHECK(total_satang BETWEEN 2000 AND 500000),
 currency CHAR(3) NOT NULL DEFAULT 'THB' CHECK(currency='THB'),
 vat_registered_snapshot BOOLEAN NOT NULL, vat_rate_bps_snapshot INTEGER NOT NULL DEFAULT 0,
 vat_included_satang BIGINT NOT NULL DEFAULT 0 CHECK(vat_included_satang>=0),
 pickup_name TEXT, phone_ciphertext TEXT, pickup_code_hash TEXT, pickup_code_ciphertext TEXT,
 payment_deadline TIMESTAMPTZ NOT NULL, reserve_deadline TIMESTAMPTZ NOT NULL,
 version BIGINT NOT NULL DEFAULT 0, completed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(total_satang=subtotal_satang+packaging_fee_satang),
 CHECK(vat_included_satang<=total_satang), CHECK(reserve_deadline>=payment_deadline),
 CHECK((mode='DINE_IN' AND visit_id IS NOT NULL) OR (mode='TAKEAWAY' AND visit_id IS NULL)),
 CHECK(mode<>'TAKEAWAY' OR (pickup_name IS NOT NULL AND pickup_code_hash IS NOT NULL AND pickup_code_ciphertext IS NOT NULL))
);
CREATE INDEX orders_store_queue ON orders(store_id,status,created_at);
CREATE INDEX orders_customer_created ON orders(customer_id,created_at DESC,id);
CREATE INDEX orders_expiry ON orders(payment_deadline) WHERE status='AWAITING_PAYMENT';
CREATE TABLE order_item (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL REFERENCES orders(id),
 product_id UUID NOT NULL REFERENCES product(id), name_snapshot TEXT NOT NULL,
 unit_base_satang BIGINT NOT NULL CHECK(unit_base_satang>=0),
 unit_options_satang BIGINT NOT NULL CHECK(unit_options_satang>=0),
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 10),
 line_total_satang BIGINT NOT NULL,
 station TEXT NOT NULL CHECK(station IN ('FOOD','DRINK')), note VARCHAR(200),
 CHECK(line_total_satang=quantity::bigint*(unit_base_satang+unit_options_satang))
);
CREATE INDEX order_item_order ON order_item(order_id);
CREATE TABLE order_item_option (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_item_id UUID NOT NULL REFERENCES order_item(id),
 choice_id UUID NOT NULL REFERENCES option_choice(id), group_snapshot TEXT NOT NULL,
 label_snapshot TEXT NOT NULL, price_delta_satang BIGINT NOT NULL CHECK(price_delta_satang>=0),
 UNIQUE(order_item_id,choice_id)
);
CREATE TABLE inventory_reservation (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL REFERENCES orders(id),
 product_id UUID NOT NULL REFERENCES inventory_stock(product_id), quantity INTEGER NOT NULL CHECK(quantity>0),
 status TEXT NOT NULL CHECK(status IN ('HELD','CONSUMED','RELEASED')),
 expires_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(order_id,product_id)
);
CREATE TABLE kitchen_ticket (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL REFERENCES orders(id),
 station TEXT NOT NULL CHECK(station IN ('FOOD','DRINK')),
 status TEXT NOT NULL CHECK(status IN ('QUEUED','PREPARING','READY','CANCELLED')),
 version BIGINT NOT NULL DEFAULT 0, started_at TIMESTAMPTZ, ready_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(order_id,station)
);
CREATE INDEX kitchen_queue ON kitchen_ticket(station,status,created_at);
CREATE TABLE order_status_event (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL REFERENCES orders(id),
 from_status TEXT, to_status TEXT NOT NULL, actor_id UUID REFERENCES app_user(id),
 reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_history ON order_status_event(order_id,created_at);
CREATE TABLE payment_attempt (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL REFERENCES orders(id),
 provider TEXT NOT NULL DEFAULT 'OMISE' CHECK(provider='OMISE'),
 ref_id TEXT NOT NULL UNIQUE, provider_charge_id TEXT UNIQUE,
 status TEXT NOT NULL CHECK(status IN ('CREATING','UNKNOWN','PENDING','SUCCEEDED','FAILED','EXPIRED')),
 amount_satang BIGINT NOT NULL CHECK(amount_satang>0), currency CHAR(3) NOT NULL CHECK(currency='THB'),
 livemode BOOLEAN NOT NULL, provider_status TEXT, qr_document_path TEXT,
 expires_at TIMESTAMPTZ NOT NULL, paid_at TIMESTAMPTZ, verified_at TIMESTAMPTZ,
 fee_satang BIGINT CHECK(fee_satang>=0), fee_vat_satang BIGINT CHECK(fee_vat_satang>=0), net_satang BIGINT,
 next_check_at TIMESTAMPTZ NOT NULL DEFAULT now(), check_count INTEGER NOT NULL DEFAULT 0,
 last_error_code TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(status<>'SUCCEEDED' OR (provider_charge_id IS NOT NULL AND verified_at IS NOT NULL AND paid_at IS NOT NULL))
);
CREATE UNIQUE INDEX one_active_attempt ON payment_attempt(order_id) WHERE status IN ('CREATING','UNKNOWN','PENDING');
CREATE INDEX payment_order ON payment_attempt(order_id);
CREATE INDEX payment_recheck ON payment_attempt(status,next_check_at);
CREATE TABLE webhook_inbox (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider TEXT NOT NULL CHECK(provider IN ('OMISE','LINE')),
 event_id TEXT NOT NULL, event_type TEXT NOT NULL, payload JSONB NOT NULL, body_hash TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK(status IN ('RECEIVED','PROCESSING','DONE','IGNORED','DEAD_LETTER')),
 attempt_count INTEGER NOT NULL DEFAULT 0, next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 locked_until TIMESTAMPTZ, lease_token UUID, last_error_code TEXT,
 received_at TIMESTAMPTZ NOT NULL DEFAULT now(), processed_at TIMESTAMPTZ,
 UNIQUE(provider,event_id)
);
CREATE INDEX inbox_due ON webhook_inbox(status,next_attempt_at);
CREATE TABLE outbox_event (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), topic TEXT NOT NULL, aggregate_id UUID NOT NULL,
 dedupe_key TEXT NOT NULL UNIQUE, payload JSONB NOT NULL,
 status TEXT NOT NULL DEFAULT 'READY' CHECK(status IN ('READY','PROCESSING','SENT','SKIPPED','DEAD_LETTER')),
 attempt_count INTEGER NOT NULL DEFAULT 0, next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 locked_until TIMESTAMPTZ, lease_token UUID, last_error_code TEXT,
 expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), sent_at TIMESTAMPTZ
);
CREATE INDEX outbox_due ON outbox_event(status,next_attempt_at);
CREATE TABLE refund_case (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), attempt_id UUID NOT NULL REFERENCES payment_attempt(id),
 amount_satang BIGINT NOT NULL CHECK(amount_satang>0),
 status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','APPROVED','PAID','REJECTED')),
 reason TEXT NOT NULL, bank_details_ciphertext TEXT, bank_reference TEXT UNIQUE, evidence_ref TEXT,
 requested_by UUID NOT NULL REFERENCES app_user(id), approved_by UUID REFERENCES app_user(id),
 paid_by UUID REFERENCES app_user(id), approved_at TIMESTAMPTZ, paid_at TIMESTAMPTZ,
 version BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(status NOT IN ('APPROVED','PAID') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
 CHECK(status<>'PAID' OR (paid_by IS NOT NULL AND paid_at IS NOT NULL AND bank_reference IS NOT NULL AND evidence_ref IS NOT NULL))
);
CREATE INDEX refund_attempt ON refund_case(attempt_id,status);
CREATE TABLE payment_incident (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), order_id UUID NOT NULL REFERENCES orders(id),
 attempt_id UUID REFERENCES payment_attempt(id), kind TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','RESOLVED')),
 details JSONB NOT NULL DEFAULT '{}', version BIGINT NOT NULL DEFAULT 0,
 resolution TEXT, resolved_by UUID REFERENCES app_user(id), resolved_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX incident_queue ON payment_incident(status,created_at);
CREATE TABLE settlement_transfer (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider_transfer_id TEXT NOT NULL UNIQUE,
 amount_satang BIGINT NOT NULL CHECK(amount_satang>0), fee_satang BIGINT NOT NULL DEFAULT 0,
 net_satang BIGINT NOT NULL, status TEXT NOT NULL, bank_reference TEXT, paid_at TIMESTAMPTZ,
 verified_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE settlement_entry (
 transfer_id UUID NOT NULL REFERENCES settlement_transfer(id), attempt_id UUID NOT NULL REFERENCES payment_attempt(id),
 allocated_net_satang BIGINT NOT NULL, PRIMARY KEY(transfer_id,attempt_id)
);
CREATE TABLE idempotency_record (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), principal_id UUID NOT NULL REFERENCES app_user(id),
 method TEXT NOT NULL, path TEXT NOT NULL, key UUID NOT NULL, request_hash TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('PROCESSING','COMPLETED')),
 response_code INTEGER, response_body JSONB, expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(principal_id,method,path,key), CHECK(state<>'COMPLETED' OR response_code IS NOT NULL)
);
CREATE INDEX idem_expiry ON idempotency_record(expires_at);
CREATE TABLE audit_log (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), actor_id UUID REFERENCES app_user(id),
 action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id UUID,
 before_redacted JSONB, after_redacted JSONB, trace_id TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_resource ON audit_log(resource_type,resource_id,created_at);

-- Implement these invariants in transaction-bound services and integration tests:
-- 1. Cross-store FK consistency and table membership, visit status, deadlines.
-- 2. Snapshot sums match orders/subtotal and item/option totals.
-- 3. Lock order -> attempts -> reservations; stock product IDs in sorted order.
-- 4. Sum APPROVED+PAID refunds <= verified amount; serialize with attempt lock.
-- 5. Every financial transition writes audit/history and outbox in same commit.
-- 6. Success is monotonic and multiple successful charges are preserved as facts.
-- 7. Cancellation request: write outbox topic ORDER_CANCELLATION_REQUESTED
--    with order/version/reason/actor; worker decides and writes history/incident.
-- 8. Runtime role cannot DELETE/UPDATE audit history; migrations use separate role.
-- 9. Use INSERT ... ON CONFLICT for inbox and business dedupe, not check-then-insert.
-- 10. Application updates version and updated_at explicitly on every mutation.

