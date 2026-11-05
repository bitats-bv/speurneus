/**
 * Verklein een foto tot een vierkante JPEG (midden uitgesneden).
 * Zo blijft de database klein en bewaren we geen originele, grote camerabeelden.
 */
export async function verkleinFoto(bestand: Blob, zijde = 320, kwaliteit = 0.8): Promise<Blob> {
  const beeld = await createImageBitmap(bestand);
  try {
    const kort = Math.min(beeld.width, beeld.height);
    const sx = (beeld.width - kort) / 2;
    const sy = (beeld.height - kort) / 2;
    const doel = Math.min(zijde, kort);

    const canvas = document.createElement('canvas');
    canvas.width = doel;
    canvas.height = doel;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas niet beschikbaar');
    ctx.drawImage(beeld, sx, sy, kort, kort, 0, 0, doel, doel);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Foto omzetten mislukt'))),
        'image/jpeg',
        kwaliteit,
      ),
    );
  } finally {
    beeld.close();
  }
}
