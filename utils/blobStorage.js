const { put, del } = require('@vercel/blob');

// Upload PDF su Vercel Blob
async function uploadPDF(buffer, filename, folder = 'vehicles') {
  try {
    // Genera path univoco: folder/filename-timestamp.pdf
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${folder}/${sanitizedFilename}-${timestamp}.pdf`;
    
    const blob = await put(path, buffer, {
      access: 'public',
      contentType: 'application/pdf',
      addRandomSuffix: false
    });
    
    console.log(`✅ PDF caricato: ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error('❌ Errore upload PDF:', error);
    throw error;
  }
}

// Elimina PDF da Vercel Blob
async function deletePDF(url) {
  try {
    if (!url || !url.includes('blob.vercel-storage.com')) {
      console.log('⚠️  URL non valido o non Blob storage, skip delete');
      return;
    }
    
    await del(url);
    console.log(`🗑️  PDF eliminato: ${url}`);
  } catch (error) {
    console.error('❌ Errore eliminazione PDF:', error);
    // Non blocchiamo l'operazione se fallisce la cancellazione
  }
}

// Upload multipli (libretto, assicurazione, contratto)
async function uploadVehicleDocuments(files, targa) {
  const urls = {};
  
  if (files.libretto_pdf && files.libretto_pdf[0]) {
    urls.libretto_pdf = await uploadPDF(
      files.libretto_pdf[0].buffer,
      `${targa}_libretto.pdf`,
      'vehicles'
    );
  }
  
  if (files.assicurazione_pdf && files.assicurazione_pdf[0]) {
    urls.assicurazione_pdf = await uploadPDF(
      files.assicurazione_pdf[0].buffer,
      `${targa}_assicurazione.pdf`,
      'vehicles'
    );
  }
  
  if (files.contratto_pdf && files.contratto_pdf[0]) {
    urls.contratto_pdf = await uploadPDF(
      files.contratto_pdf[0].buffer,
      `${targa}_contratto.pdf`,
      'vehicles'
    );
  }
  
  return urls;
}

// Elimina documenti vecchi quando si carica nuovo file
async function deleteVehicleDocuments(oldUrls) {
  const promises = [];
  
  if (oldUrls.libretto_pdf) {
    promises.push(deletePDF(oldUrls.libretto_pdf));
  }
  if (oldUrls.assicurazione_pdf) {
    promises.push(deletePDF(oldUrls.assicurazione_pdf));
  }
  if (oldUrls.contratto_pdf) {
    promises.push(deletePDF(oldUrls.contratto_pdf));
  }
  
  await Promise.allSettled(promises);
}

module.exports = {
  uploadPDF,
  deletePDF,
  uploadVehicleDocuments,
  deleteVehicleDocuments
};
