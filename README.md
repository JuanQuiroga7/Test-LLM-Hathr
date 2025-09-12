# Hathr AI Interface

Interfaz web moderna para interactuar con la API de Hathr AI, incluyendo chat con modelos de IA y subida de documentos.

## 🚀 Características

- **Chat con IA**: Interfaz de chat intuitiva para conversar con modelos de Hathr AI
- **Subida de documentos**: Carga y procesa documentos PDF, TXT y DOCX
- **Proxy Node.js**: Servidor proxy para evitar problemas de CORS
- **Interfaz responsive**: Diseño moderno que funciona en desktop y móvil
- **Autenticación OAuth 2.0**: Integración segura con Hathr AI
- **Configuración flexible**: Ajustes de temperatura y top-p para el modelo

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Autenticación**: OAuth 2.0 con JWT
- **API**: Hathr AI REST API
- **Almacenamiento**: AWS S3 (para documentos)

## 📋 Requisitos

- Node.js 14 o superior
- npm o yarn
- Credenciales de Hathr AI (Client ID y Client Secret)

## 🚀 Instalación

1. **Clona el repositorio**:
```bash
git clone https://github.com/TU_USUARIO/hathr-ai-interface.git
cd hathr-ai-interface
```

2. **Instala las dependencias**:
```bash
npm install
```

3. **Inicia el servidor**:
```bash
npm start
```

4. **Abre tu navegador** en `http://localhost:3000`

## 🔧 Uso

### 1. Configuración inicial
- Ingresa tu **Client ID** y **Client Secret** de Hathr AI
- Haz clic en **"Conectar"** para autenticarte

### 2. Chat con la IA
- Escribe tu mensaje en el campo de texto
- Presiona Enter o haz clic en **"Enviar"**
- El modelo responderá en tiempo real

### 3. Subir documentos
- Haz clic en **"📤 Subir documento"**
- Selecciona un archivo (PDF, TXT, DOCX)
- El documento se procesará automáticamente
- Aparecerá en la lista de documentos disponibles

### 4. Chat con documentos
- Selecciona uno o más documentos de la lista
- Escribe tu pregunta
- El modelo responderá basándose en el contenido de los documentos

## ⚙️ Configuración

### Parámetros del modelo
- **Temperature**: Controla la creatividad (0.0 - 2.0)
- **Top P**: Controla la diversidad (0.0 - 1.0)

### Variables de entorno (opcional)
Puedes crear un archivo `.env` con:
```
HATHR_CLIENT_ID=tu_client_id
HATHR_CLIENT_SECRET=tu_client_secret
```

## 📁 Estructura del proyecto

```
hathr-ai-interface/
├── testLLM_clean.html    # Interfaz web principal
├── server.js             # Servidor proxy Node.js
├── package.json          # Configuración y dependencias
├── package-lock.json     # Versiones exactas de dependencias
├── .gitignore           # Archivos a ignorar en Git
├── README.md            # Este archivo
└── uploads/             # Directorio para archivos temporales (ignorado por Git)
```

## 🔒 Seguridad

- ✅ Las credenciales se almacenan solo en el navegador
- ✅ El proxy maneja la autenticación de forma segura
- ✅ No se almacenan tokens en el servidor
- ✅ Comunicación HTTPS con la API de Hathr
- ✅ Archivos de credenciales excluidos del repositorio

## 🐛 Solución de problemas

### Error de CORS
- El proxy Node.js resuelve automáticamente los problemas de CORS
- Asegúrate de que el servidor esté corriendo en `http://localhost:3000`

### Error de autenticación
- Verifica que tus credenciales sean correctas
- Asegúrate de que el scope sea `hathr/llm`
- Los tokens JWT expiran, reconecta si es necesario

### Error de subida de documentos
- Verifica que el archivo sea compatible (PDF, TXT, DOCX)
- Asegúrate de que tengas conexión a internet
- Revisa la consola del navegador para más detalles

## 📝 API Endpoints

### Proxy endpoints
- `POST /proxy/auth` - Autenticación OAuth 2.0
- `GET /proxy/document/list` - Listar documentos
- `POST /proxy/document/upload` - Obtener URL de subida
- `POST /proxy/document/chat` - Chat con documentos
- `POST /proxy/chat` - Chat general
- `GET /proxy/document/complete` - Verificar procesamiento

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Si tienes problemas o preguntas:
- Abre un issue en GitHub
- Revisa la documentación de [Hathr AI](https://docs.hathr.ai)
- Verifica la consola del navegador para errores

## 🎯 Roadmap

- [ ] Soporte para más tipos de archivos
- [ ] Historial de conversaciones
- [ ] Exportar conversaciones
- [ ] Temas personalizables
- [ ] Integración con más APIs de IA

---

**Desarrollado con ❤️ para la comunidad de Hathr AI**
