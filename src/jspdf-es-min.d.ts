declare module "jspdf/dist/jspdf.es.min.js" {
  import type { jsPDF } from "jspdf";

  const JsPDFCtor: typeof jsPDF;
  export default JsPDFCtor;
}
