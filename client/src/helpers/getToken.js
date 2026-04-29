export function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("portalToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("portalToken")
  );
}