const puppeteer = require('puppeteer');

/**
 * Genera un PDF a partir de HTML usando Puppeteer
 */
class PDFGenerator {
  /**
   * Genera el HTML para el reporte
   */
  static generarHTMLReporte(datos, tipo) {
    const { fecha_generacion, data, resumen, parametros } = datos;

    // Sanitizar valores para evitar problemas en HTML
    const sanitizar = (valor) => {
      if (valor === null || valor === undefined) return 'N/A';
      if (typeof valor === 'object') return JSON.stringify(valor);
      return String(valor).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte - ${tipo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            padding: 30px;
            color: #1f2937;
            line-height: 1.5;
          }
          .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .header h1 {
            color: #1f2937;
            font-size: 24px;
            margin-bottom: 8px;
          }
          .header .subtitle {
            color: #6b7280;
            font-size: 13px;
          }
          .meta-info {
            background: #f3f4f6;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 25px;
            font-size: 11px;
          }
          .meta-info p {
            margin: 4px 0;
            color: #4b5563;
          }
          .resumen {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 25px;
          }
          .resumen-item {
            background: #eff6ff;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
          }
          .resumen-item .label {
            font-size: 11px;
            color: #6b7280;
            text-transform: capitalize;
            margin-bottom: 4px;
          }
          .resumen-item .value {
            font-size: 20px;
            font-weight: bold;
            color: #1e40af;
            word-break: break-word;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            margin: 25px 0 12px 0;
            color: #1f2937;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 10px;
          }
          th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
            word-wrap: break-word;
            max-width: 200px;
          }
          th {
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
          }
          .footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte ${sanitizar(tipo.replace(/_/g, ' '))}</h1>
          <p class="subtitle">Sistema de Gestión de NAPs - ISP</p>
        </div>

        <div class="meta-info">
          <p><strong>Fecha de generación:</strong> ${new Date(fecha_generacion).toLocaleString('es-ES')}</p>
          ${parametros && Object.keys(parametros).length > 0 ? `
            <p><strong>Parámetros:</strong> ${Object.entries(parametros).map(([k, v]) => `${sanitizar(k)}: ${sanitizar(v)}`).join(', ')}</p>
          ` : ''}
        </div>

        ${resumen ? `
          <h2 class="section-title">Resumen Ejecutivo</h2>
          <div class="resumen">
            ${Object.entries(resumen).map(([key, value]) => `
              <div class="resumen-item">
                <div class="label">${sanitizar(key.replace(/_/g, ' '))}</div>
                <div class="value">${sanitizar(value)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <h2 class="section-title">Datos Detallados</h2>
        ${this.generarTablaDatos(data, tipo)}

        <div class="footer">
          <p>Generado por Sistema de Gestión de NAPs - ${new Date().getFullYear()}</p>
          <p>Este documento es confidencial y de uso interno</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Genera la tabla de datos según el tipo de reporte
   */
  static generarTablaDatos(data, tipo) {
    if (!data || data.length === 0) {
      return '<p>No hay datos disponibles para mostrar.</p>';
    }

    // Sanitizar y formatear valores
    const formatearValor = (valor) => {
      if (valor === null || valor === undefined) return '-';

      // Si es un array vacío, mostrar "Ninguno" o "-"
      if (Array.isArray(valor)) {
        if (valor.length === 0) return '-';
        // Si es un array con datos, mostrar la cantidad
        return `${valor.length} registro${valor.length !== 1 ? 's' : ''}`;
      }

      // Si es un objeto, no mostrarlo (ya debería estar aplanado)
      if (typeof valor === 'object') return '-';

      return String(valor).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    // Aplanar objetos anidados para la tabla
    const aplanarObjeto = (obj, prefijo = '') => {
      const resultado = {};
      for (const key in obj) {
        const valor = obj[key];
        const nuevoKey = prefijo ? `${prefijo}.${key}` : key;

        // Si es un objeto (no array), aplanarlo recursivamente
        if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
          Object.assign(resultado, aplanarObjeto(valor, nuevoKey));
        } else {
          // Si es un valor primitivo o array, agregarlo
          resultado[nuevoKey] = valor;
        }
      }
      return resultado;
    };

    // Filtrar columnas que no queremos mostrar en el PDF
    const columnasExcluidas = ['conexiones_activas', 'conexiones', 'puertos', 'mantenimientos'];

    // Aplanar los datos
    const datosAplanados = data.map(item => aplanarObjeto(item));

    // Detectar columnas y filtrar las excluidas
    const todasLasColumnas = Object.keys(datosAplanados[0] || {});
    const columnas = todasLasColumnas.filter(col => {
      // Excluir columnas específicas y cualquier columna que termine con arrays complejos
      const esExcluida = columnasExcluidas.some(exc => col.includes(exc));
      return !esExcluida;
    });

    if (columnas.length === 0) {
      return '<p>No hay datos disponibles para mostrar.</p>';
    }

    // Formatear nombre de columna para el header
    const formatearNombreColumna = (col) => {
      return col
        .replace(/_/g, ' ')
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' - ');
    };

    return `
      <table>
        <thead>
          <tr>
            ${columnas.map(col => `<th>${formatearNombreColumna(col)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${datosAplanados.slice(0, 50).map(item => `
            <tr>
              ${columnas.map(col => `<td>${formatearValor(item[col])}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${data.length > 50 ? `<p style="text-align: center; color: #6b7280; font-size: 11px; margin-top: 10px;">Mostrando los primeros 50 registros de ${data.length}</p>` : ''}
    `;
  }

  /**
   * Genera un PDF y lo devuelve como buffer
   */
  static async generarPDF(datos, tipo) {
    let browser = null;
    try {
      console.log('Iniciando generación de PDF...');

      // Generar HTML
      const html = this.generarHTMLReporte(datos, tipo);

      // Iniciar Puppeteer con opciones más robustas
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();

      // Configurar el contenido
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      console.log('HTML cargado, generando PDF...');

      // Generar PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true,
        preferCSSPageSize: false
      });

      console.log(`PDF generado exitosamente: ${pdfBuffer.length} bytes`);

      return pdfBuffer;
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw new Error(`No se pudo generar el PDF: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
        console.log('Navegador cerrado');
      }
    }
  }
}

module.exports = PDFGenerator;
