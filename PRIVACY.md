# Política de privacidad de ShiftLog

Última actualización: 6 de noviembre de 2026.

ShiftLog es una app gratuita y de código abierto para Android. Esta política explica qué hace con tus datos. En resumen: **tus datos son tuyos, se quedan en tu dispositivo y no hay ningún servidor del autor de la app que los reciba.**

## Qué datos guarda la app

Tus trabajos, turnos, eventos de agenda, plantillas y ajustes. Se guardan únicamente en el almacenamiento interno de tu dispositivo. La app no tiene cuentas de usuario, no incluye anuncios, ni analítica, ni rastreadores.

## Qué hace la app con internet

Solo hace tres cosas con internet, y las tres son opcionales:

1. **Buscar versiones nuevas.** Al abrir la app consulta la API pública de GitHub para saber si hay una versión más reciente y, si tú lo pides, descarga el APK desde las publicaciones de este repositorio. No se envía ningún dato tuyo. Se puede desactivar en Ajustes → Actualizaciones.
2. **Copia de seguridad en Google Drive.** Solo si conectas tu cuenta de Google en Ajustes → Copia de seguridad. La app pide un único permiso, `drive.appdata`, que solo permite crear, leer y borrar archivos dentro de una carpeta oculta de tu propio Drive reservada a ShiftLog. La app no puede ver ni modificar ningún otro archivo de tu Drive, ni accede a tu correo, contactos u otros datos de tu cuenta, salvo la dirección de correo que muestra en Ajustes para indicar qué cuenta está conectada.

3. **Avisos de versiones nuevas.** Mientras «Avisar de versiones nuevas» esté activado (lo está por defecto), el móvil se suscribe a un tema llamado `updates` de Firebase Cloud Messaging, un servicio de Google, para recibir una notificación cuando se publica una versión. Para ello Google asigna al móvil un identificador de instalación de Firebase. ShiftLog no lo guarda ni lo envía a ningún sitio, y el aviso es el mismo para todos: no se envía ningún dato tuyo ni de tus turnos. Se desactiva en Ajustes → Actualizaciones, que cancela la suscripción, o negando el permiso de notificaciones de Android.

La copia contiene tus datos de ShiftLog y viaja directamente entre tu dispositivo y tu Google Drive. El autor de la app no la recibe ni puede verla.

## Calendario del móvil

Es opcional y está desactivado por defecto. Si lo activas en Ajustes → Calendario del móvil, Android te pide permiso para leer y modificar los calendarios. ShiftLog lo usa solo para copiar los **eventos de tu agenda** (no los turnos, horas ni importes) en el calendario que elijas, y para actualizarlos o borrarlos cuando cambian en la app. Nunca lee tus otros eventos. Si ese calendario es el de tu cuenta de Google, es Android, no ShiftLog, quien lo sincroniza con Google Calendar. Puedes dejar de sincronizar cuando quieras y elegir si los eventos ya copiados se quitan del calendario.

## Uso de los datos de Google

El uso que ShiftLog hace de la información recibida de las APIs de Google cumple la [Política de datos de usuario de los servicios de las API de Google](https://developers.google.com/terms/api-services-user-data-policy), incluidos los requisitos de uso limitado. Los datos de tu Drive solo se usan para guardar y restaurar tu copia de seguridad, no se transfieren a terceros y nadie puede leerlos.

## Cómo borrar tus datos

- **En el dispositivo:** desinstala la app o borra sus datos desde los ajustes de Android.
- **En Drive:** desconecta la cuenta en Ajustes → Copia de seguridad (la copia ya subida no se borra sola), revoca el acceso de ShiftLog en la [configuración de seguridad de tu cuenta de Google](https://myaccount.google.com/connections) y borra los datos ocultos de la app desde Google Drive → Configuración → Administrar aplicaciones → ShiftLog → Opciones → «Eliminar datos de aplicaciones ocultos».

## Contacto

Para cualquier duda sobre privacidad, abre una incidencia en [github.com/Camach0F/ShiftLog/issues](https://github.com/Camach0F/ShiftLog/issues) o escribe en el [servidor de Discord de soporte](https://discord.gg/4tyPqWuedP).

Si esta política cambia, se actualizará en este archivo y la fecha de arriba reflejará el cambio.
