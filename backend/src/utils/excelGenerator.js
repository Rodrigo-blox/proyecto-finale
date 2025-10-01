const ExcelJS = require('exceljs');

/**
 * Genera archivos Excel para reportes
 */
class ExcelGenerator {
  /**
   * Genera un archivo Excel y lo devuelve como buffer
   */
  static async generarExcel(datos, tipo) {
    try {
      const { fecha_generacion, data, resumen, parametros } = datos;

      // Crear libro de trabajo
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistema de Gestión de NAPs';
      workbook.created = new Date();

      // Hoja 1: Resumen
      if (resumen) {
        const hojaResumen = workbook.addWorksheet('Resumen');

        // Configurar estilos
        hojaResumen.getRow(1).font = { bold: true, size: 14 };
        hojaResumen.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2563EB' }
        };
        hojaResumen.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        // Título
        hojaResumen.mergeCells('A1:B1');
        hojaResumen.getCell('A1').value = `Reporte ${tipo.replace(/_/g, ' ')}`;
        hojaResumen.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

        // Información meta
        let fila = 3;
        hojaResumen.getCell(`A${fila}`).value = 'Fecha de Generación:';
        hojaResumen.getCell(`A${fila}`).font = { bold: true };
        hojaResumen.getCell(`B${fila}`).value = new Date(fecha_generacion).toLocaleString('es-ES');
        fila++;

        if (parametros && Object.keys(parametros).length > 0) {
          hojaResumen.getCell(`A${fila}`).value = 'Parámetros:';
          hojaResumen.getCell(`A${fila}`).font = { bold: true };
          fila++;

          Object.entries(parametros).forEach(([key, value]) => {
            hojaResumen.getCell(`A${fila}`).value = `  ${key}:`;
            hojaResumen.getCell(`B${fila}`).value = value || 'N/A';
            fila++;
          });
        }

        fila += 2;

        // Resumen ejecutivo
        hojaResumen.getCell(`A${fila}`).value = 'Resumen Ejecutivo';
        hojaResumen.getCell(`A${fila}`).font = { bold: true, size: 12 };
        hojaResumen.getRow(fila).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE5E7EB' }
        };
        fila++;

        Object.entries(resumen).forEach(([key, value]) => {
          hojaResumen.getCell(`A${fila}`).value = key.replace(/_/g, ' ');
          hojaResumen.getCell(`A${fila}`).font = { bold: true };
          hojaResumen.getCell(`B${fila}`).value = typeof value === 'object' ? JSON.stringify(value) : value;
          fila++;
        });

        // Ajustar anchos de columnas
        hojaResumen.getColumn(1).width = 30;
        hojaResumen.getColumn(2).width = 40;
      }

      // Hoja 2: Datos detallados
      if (data && data.length > 0) {
        const hojaDatos = workbook.addWorksheet('Datos Detallados');

        // Obtener columnas del primer elemento
        const primerElemento = data[0];
        const columnas = this.obtenerColumnasAplanadas(primerElemento);

        // Encabezados (formatear nombres con puntos en lugar de guiones bajos)
        hojaDatos.addRow(columnas.map(col =>
          col.replace(/_/g, ' ')
             .split('.')
             .map(part => part.charAt(0).toUpperCase() + part.slice(1))
             .join(' - ')
        ));

        // Estilo de encabezados
        const headerRow = hojaDatos.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2563EB' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        // Agregar datos
        data.forEach(item => {
          const valores = this.extraerValoresAplanados(item, columnas);
          hojaDatos.addRow(valores);
        });

        // Ajustar anchos de columnas automáticamente
        hojaDatos.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, cell => {
            const length = cell.value ? cell.value.toString().length : 10;
            if (length > maxLength) {
              maxLength = length;
            }
          });
          column.width = Math.min(Math.max(maxLength + 2, 12), 50);
        });

        // Aplicar filtros
        hojaDatos.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: columnas.length }
        };

        // Congelar primera fila
        hojaDatos.views = [{ state: 'frozen', ySplit: 1 }];
      }

      // Generar buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      console.error('Error al generar Excel:', error);
      throw new Error('No se pudo generar el archivo Excel');
    }
  }

  /**
   * Obtiene las columnas aplanadas de un objeto (maneja objetos anidados)
   */
  static obtenerColumnasAplanadas(obj, prefijo = '') {
    const columnas = [];
    const columnasExcluidas = ['conexiones_activas', 'conexiones', 'puertos', 'mantenimientos'];

    Object.keys(obj).forEach(key => {
      const valor = obj[key];
      const nombreColumna = prefijo ? `${prefijo}.${key}` : key;

      // Verificar si la columna debe ser excluida
      const esExcluida = columnasExcluidas.some(exc => nombreColumna.includes(exc));
      if (esExcluida) return;

      if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
        // Objeto anidado: recursión
        columnas.push(...this.obtenerColumnasAplanadas(valor, nombreColumna));
      } else {
        columnas.push(nombreColumna);
      }
    });

    return columnas;
  }

  /**
   * Extrae valores aplanados de un objeto según las columnas especificadas
   */
  static extraerValoresAplanados(obj, columnas) {
    return columnas.map(columna => {
      // Navegar por el path de la columna usando punto (ej: "nap.codigo")
      const partes = columna.split('.');
      let valor = obj;

      for (const parte of partes) {
        if (valor && typeof valor === 'object') {
          valor = valor[parte];
        } else {
          break;
        }
      }

      // Convertir valores especiales
      if (valor === null || valor === undefined) {
        return '-';
      }

      // Si es array vacío
      if (Array.isArray(valor)) {
        if (valor.length === 0) return '-';
        return `${valor.length} registro${valor.length !== 1 ? 's' : ''}`;
      }

      // Si es objeto, no mostrarlo
      if (typeof valor === 'object') {
        return '-';
      }

      if (typeof valor === 'boolean') {
        return valor ? 'Sí' : 'No';
      }

      return valor;
    });
  }
}

module.exports = ExcelGenerator;
