type Liff = {
  init(options: { liffId: string }): Promise<void>;
  isLoggedIn(): boolean;
  login(options: { redirectUri: string }): void;
  getIDToken(): string | null;
};
declare global {
  interface Window {
    liff?: Liff;
  }
}
let loading: Promise<Liff> | undefined;
export function loadLiff(): Promise<Liff> {
  if (window.liff) return Promise.resolve(window.liff);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.async = true;
    script.onload = () =>
      window.liff
        ? resolve(window.liff)
        : reject(new Error("โหลด LINE SDK ไม่สำเร็จ"));
    script.onerror = () => {
      loading = undefined;
      reject(new Error("เชื่อมต่อ LINE ไม่สำเร็จ"));
    };
    document.head.append(script);
  });
  return loading;
}
