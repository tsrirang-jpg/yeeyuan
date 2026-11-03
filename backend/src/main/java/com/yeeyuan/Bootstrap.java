package com.yeeyuan;
import java.util.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
@Component
public class Bootstrap implements ApplicationRunner {
 final Db db;final Auth auth;final Settings config;final Crypto crypto;
 public Bootstrap(Db db,Auth auth,Settings config,Crypto crypto){this.db=db;this.auth=auth;this.config=config;this.crypto=crypto;}
 @Override @Transactional public void run(ApplicationArguments args){UUID store=(UUID)db.one("SELECT id FROM store LIMIT 1").get("id");if(config.local())db.jdbc.update("UPDATE store SET accepting_orders=true");if(!config.adminPassword().isBlank()&&db.jdbc.queryForList("SELECT id FROM app_user WHERE username='owner'").isEmpty()){if(config.adminPassword().length()<12)throw new IllegalArgumentException("Bootstrap password must have at least 12 characters");UUID id=UUID.randomUUID();String mfa=config.adminTotpSecret().isBlank()&&config.local()?"LOCAL_MFA_DISABLED":crypto.encrypt(config.adminTotpSecret());db.jdbc.update("INSERT INTO app_user(id,kind,username,display_name,password_hash,totp_secret_ciphertext) VALUES(?,'STAFF','owner','เจ้าของร้าน',?,?)",id,auth.encodePassword(config.adminPassword()),mfa);db.jdbc.update("INSERT INTO staff_role(user_id,store_id,role) VALUES(?,?,'OWNER')",id,store);}for(int n=1;n<=5;n++)db.jdbc.update("INSERT INTO dining_table(store_id,code,qr_token_hash) VALUES(?,?,?) ON CONFLICT(store_id,code) DO NOTHING",store,String.format("%02d",n),Crypto.hash(Crypto.token()));}
}
