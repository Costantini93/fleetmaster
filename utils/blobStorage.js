const { put, del } = require('@vercel/blob');

// Verifica se Blob storage è configurato
const BLOB_ENABLED = !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL);

// Upload PDF su Vercel Blob (o fallback base64)
async function uploadPDF(buffer, filename, folder = 'vehicles') {
  // Se Blob non configurato, ritorna null (usare base64 come fallback)
  if (!BLOB_ENABLED) {
    console.log('⚠️  Blob storage non configurato, usa base64 legacy');
    return null;
  }

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
    
    console.log(`✅ PDF caricato su Blob: ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error('❌ Errore upload PDF su Blob:', error);
    return null; // Fallback a base64
  }
}

// Elimina PDF da Vercel Blob
async function deletePDF(url) {
  if (!BLOB_ENABLED || !url) {
    return; // Skip se non configurato o URL vuoto
  }

  try {
    if (!url.includes('blob.vercel-storage.com')) {
      console.log('⚠️  URL non è Blob storage, skip delete');
      return;
    }
    
    await del(url);
    console.log(`🗑️  PDF eliminato da Blob: ${url}`);
  } catch (error) {
    console.error('❌ Errore eliminazione PDF da Blob:', error);
    // Non blocchiamo l'operazione se fallisce la cancellazione
  }
}

//// Se Blob non configurato, converti in base64 (legacy mode)
  if (!BLOB_ENABLED) {
    if (files.libretto_pdf && files.libretto_pdf[0]) {
      urls.libretto_pdf = `data:application/pdf;base64,${files.libretto_pdf[0].buffer.toString('base64')}`;
    }
    if (files.assicurazione_pdf && files.assicurazione_pdf[0]) {
      urls.assicurazione_pdf = `data:application/pdf;base64,${files.assicurazione_pdf[0].buffer.toString('base64')}`;
    }
    if (files.contratto_pdf && files.contratto_pdf[0]) {
      urls.contratto_pdf = `data:application/pdf;base64,${files.contratto_pdf[0].buffer.toString('base64')}`;
    }
    console.log('⚠️  Blob non configurato, salvati come base64');
    return urls;
  }
  
  // Upload su Blob storage
  if (files.libretto_pdf && files.libretto_pdf[0]) {
    const url = await uploadPDF(
      files.libretto_pdf[0].buffer,
      `${targa}_libretto.pdf`,
      'vehicles'
    );
    if (url) urls.libretto_pdf = url;
    else urls.libretto_pdf = `data:application/pdf;base64,${files.libretto_pdf[0].buffer.toString('base64')}`;
  }
  
  if (files.assicurazione_pdf && files.assicurazione_pdf[0]) {
    const url = await uploadPDF(
      files.assicurazione_pdf[0].buffer,
      `${targa}_assicurazione.pdf`,
      'vehicles'
    );
    if (url) urls.assicurazione_pdf = url;
    else urls.assicurazione_pdf = `data:application/pdf;base64,${files.assicurazione_pdf[0].buffer.toString('base64')}`;
  }
  
  if (files.contratto_pdf && files.contratto_pdf[0]) {
    const url = await uploadPDF(
      files.contratto_pdf[0].buffer,
      `${targa}_contratto.pdf`,
      'vehicles'
    );
    if (url) urls.contratto_pdf = url;
    else urls.contratto_pdf = `data:application/pdf;base64,${files.contratto_pdf[0].buffer.toString('base64')}`rls.contratto_pdf = await uploadPDF(
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
