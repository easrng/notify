import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
export default url.fileURLToPath(new URL(".", import.meta.url));
