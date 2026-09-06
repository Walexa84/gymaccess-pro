/**
 * Traductor Semántico de Errores de Hik-Connect Teams OpenAPI V2.11
 * Transforma códigos hexadecimales y mensajes crudos de la API en explicaciones
 * didácticas y accionables para el usuario del gimnasio.
 */
export class TeamsErrorTranslator {
  public static translate(errorCode?: string | number, rawMessage?: string): string {
    const codeStr = String(errorCode || '').toLowerCase();
    const msg = String(rawMessage || '').toLowerCase();

    // 1. Errores de validación de parámetros (OPEN000010)
    if (codeStr === 'open000010' || msg.includes('validated failed argument') || msg.includes('param valid error')) {
      if (msg.includes('lastname')) {
        return '👤 Falta el Apellido: Hikvision requiere que el socio tenga al menos un apellido registrado para darlo de alta en el checador.';
      }
      if (msg.includes('firstname') || msg.includes('personname')) {
        return '👤 Nombre Obligatorio: Debes ingresar el nombre del socio antes de enviarlo al checador.';
      }
      if (msg.includes('phoneno') || msg.includes('phone')) {
        return '📞 Teléfono Inválido: Verifica que el número de teléfono tenga 10 dígitos numéricos y no contenga letras.';
      }
      if (msg.includes('photobase64') || msg.includes('photo')) {
        return '📷 Fotografía Inválida: La imagen debe ser un archivo JPG o PNG con formato válido.';
      }
      if (msg.includes('personcode')) {
        return '🏷️ Código de Socio Inválido: Solo se permiten letras y números (sin guiones, espacios ni símbolos especiales).';
      }
      if (msg.includes('startdate') || msg.includes('enddate')) {
        return '📅 Fechas de Vigencia Inválidas: Verifica que la fecha de vigencia esté en formato correcto (YYYY-MM-DD).';
      }
      if (msg.includes('gender')) {
        return '👥 Género no especificado: Se requiere asignar género para cumplir con la terminal facial.';
      }
      return `⚠️ Datos Incompletos: Hikvision reportó que faltan datos obligatorios del socio (${rawMessage || 'Parámetro inválido'}).`;
    }

    // 2. Errores de código inmutable en Teams
    if (codeStr === 'CCF000001' || msg.includes('same with old code')) {
      return '🏷️ Código Inmutable en Nube: En Hik-Connect, el código de socio no se puede modificar una vez enrolado en los checadores.';
    }

    // 3. Errores oficiales de fotografía y biometría facial
    if (codeStr === '0x6001' || msg.includes('photo invalid')) {
      return '📷 Fotografía no cumple requisitos: Asegúrate de que la foto tenga buena luz, esté tomada de frente y sin lentes oscuros.';
    }
    if (codeStr === '0x6003' || msg.includes('face recognition failed')) {
      return '👁️ Rostro no detectado: El checador no pudo identificar una cara clara en la foto. Usa el botón "Subir PC" o "Webcam" para centrar el rostro en la silueta 3:4.';
    }

    // 4. Límite de peticiones por segundo (Rate Limit de 5 req/s)
    if (codeStr === '0x2006' || msg.includes('rate limit')) {
      return '⏳ Nube de Hikvision Ocupada: Se superó el límite de 5 peticiones por segundo. Espera 3 segundos y vuelve a presionar el botón.';
    }

    // 4. Límite de 100 usuarios en Teams
    if (codeStr === '0x3003' || msg.includes('resource limit exceeded') || msg.includes('person count limit')) {
      return '⚠️ Cupo Máximo Alcanzado en Teams: Se llegó al límite de 100 usuarios gratuitos en esta cuenta. Ve al botón "Triaje Checador" y purga socios inactivos para liberar espacio.';
    }

    // 5. Hardware offline o sin respuesta
    if (codeStr === '0x3004' || msg.includes('device offline')) {
      return '🔌 Checador Desconectado: La terminal biométrica no responde. Revisa que esté encendida y conectada a la red.';
    }
    if (codeStr === '0x3005' || msg.includes('device busy')) {
      return '⏳ Checador Ocupado: La terminal está procesando registros en este momento. Intenta de nuevo en unos segundos.';
    }

    // 6. Tarjetas duplicadas
    if (codeStr === '0x6002' || msg.includes('card number duplicate')) {
      return '💳 Tarjeta Duplicada: El número de tarjeta ya está asignado a otra persona en el sistema.';
    }

    // 7. Autenticación / Token expirado
    if (codeStr === '0x2001' || codeStr === '0x2004' || msg.includes('token expired') || msg.includes('token')) {
      return '🔑 Sesión Expirada con la Nube: El token de Teams venció. El sistema está reconectando automáticamente, intenta de nuevo.';
    }

    // Fallback genérico legible
    return `⚠️ Nube de Teams (${errorCode || 'Error'}): ${rawMessage || 'No se pudo completar la sincronización con el hardware.'}`;
  }
}
