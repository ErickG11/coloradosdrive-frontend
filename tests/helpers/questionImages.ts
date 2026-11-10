export const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 0, 0, 0, 0]);
export function pngFile(name = "señal.png"): File {
  return new File([PNG_BYTES], name, { type: "image/png" });
}
