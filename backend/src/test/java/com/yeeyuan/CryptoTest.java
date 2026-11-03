package com.yeeyuan;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.*;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;
class CryptoTest {
 @Test void rejectsModifiedAndStaleOmisePayload(){String secret=Base64.getEncoder().encodeToString("sample signing key".getBytes(StandardCharsets.UTF_8));String timestamp="1800000000";byte[] raw="{\"id\":\"evt_test\"}".getBytes(StandardCharsets.UTF_8);String sig=HexFormat.of().formatHex(Crypto.hmac(Base64.getDecoder().decode(secret),(timestamp+"."+new String(raw,StandardCharsets.UTF_8)).getBytes(StandardCharsets.UTF_8),"HmacSHA256"));assertTrue(Crypto.omiseSignature(secret,timestamp,sig,raw,Instant.ofEpochSecond(1800000000)));assertFalse(Crypto.omiseSignature(secret,timestamp,sig,"{}".getBytes(StandardCharsets.UTF_8),Instant.ofEpochSecond(1800000000)));assertFalse(Crypto.omiseSignature(secret,timestamp,sig,raw,Instant.ofEpochSecond(1800000301)));assertTrue(Crypto.omiseSignature(secret,timestamp,"wrong,"+sig,raw,Instant.ofEpochSecond(1800000000)));}
 @Test void lineSignatureIsProviderSpecific(){byte[] raw="{\"events\":[]}".getBytes(StandardCharsets.UTF_8);String sig=Base64.getEncoder().encodeToString(Crypto.hmac("secret".getBytes(StandardCharsets.UTF_8),raw,"HmacSHA256"));assertTrue(Crypto.lineSignature("secret",sig,raw));assertFalse(Crypto.lineSignature("other",sig,raw));assertFalse(Crypto.lineSignature("secret",sig,"[]".getBytes(StandardCharsets.UTF_8)));}
 @Test void qrRejectsUntrustedHosts(){assertThrows(Problem.class,()->Payments.qrUri("http://api.omise.co/charges/a"));assertThrows(Problem.class,()->Payments.qrUri("https://api.omise.co.evil.invalid/charges/a"));assertThrows(Problem.class,()->Payments.qrUri("https://api.omise.co:443/charges/a"));assertThrows(Problem.class,()->Payments.qrUri("https://api.omise.co/accounts"));assertEquals("api.omise.co",Payments.qrUri("https://api.omise.co/charges/a/documents/b").getHost());}
}
