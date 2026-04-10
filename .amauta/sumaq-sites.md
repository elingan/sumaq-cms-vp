# Sumaq Sites - Documento Consolidado del Proyecto

**Versión:** 1.4
**Última actualización:** Abril 2026
**Autor:** MiniMax Agent
**Última actualización de código:** Estados MVP marcados como pendientes + Nuevo proyecto vibe coding

---

## ⚠️ ESTADO DEL PROYECTO

> **NOTA IMPORTANTE:** Este documento consolida la especificación y análisis del proyecto Sumaq Sites.
>
> **Todos los estados del MVP están marcados como "Pendiente de implementar" (⏳)**
>
> **Próximo paso:** Se creará un nuevo proyecto utilizando **vibe coding** (generación de código asistida por IA) para implementar el CMS.

**Sumaq Sites** es un Git-based Headless CMS diseñado específicamente para landing pages y portfolios, priorizando la simplicidad para usuarios no técnicos.

- **Sumaq CMS** (panel de administración): Construido con **Nuxt.js** + **Nuxt UI**
- **Sitios de clientes**: Construidos con **Astro** (un repositorio por cliente)

El contenido se edita mediante una interfaz visual en el CMS y se guarda en **Neon PostgreSQL**, mientras que la estructura del contenido (esquemas YAML en `/cms/`) y los datos JSON (en `src/data/`) se almacenan en repositorios GitHub individuales de cada cliente, permitiendo deployment automático en **Vercel**.

---

## 1. Visión del Proyecto

### 1.1 Propósito

Sumaq Sites permite a usuarios sin conocimientos técnicos editar contenido de sitios web estáticos mediante una interfaz intuitiva. El contenido se guarda en base de datos para facilitar la edición y se sincroniza con repositorios Git para deployment automático.

### 1.2 Diferenciadores Clave

| Aspecto            | Sumaq Sites                      | TinaCMS        | DecapCMS       |
| ------------------ | -------------------------------- | -------------- | -------------- |
| **Editor Visual**  | Formularios dinámicos desde YAML | Block-based    | WYSIWYG        |
| **Base de Datos**  | Neon PostgreSQL                  | Git-only       | Git-only       |
| **Sincronización** | Bidireccional DB ↔ Git           | Unidireccional | Unidireccional |
| **Deploy**         | Automático en Vercel             | Manual         | Manual         |
| **Target**         | Landing pages, portfolios        | Blogs, docs    | Blogs, docs    |

### 1.3 Tecnologías Confirmadas

| Componente           | Tecnología                | Notas                        |
| -------------------- | ------------------------- | ---------------------------- |
| **Frontend**         | Nuxt.js 4                 | Solo Nuxt, sin SvelteKit     |
| **UI Framework**     | Nuxt UI 4                 | Componentes Tailwind         |
| **Base de datos**    | Neon PostgreSQL           | Serverless, branching        |
| **Desarrollo local** | PGlite                    | Sin necesidad de Neon en dev |
| **ORM**              | Drizzle ORM               | Type-safe schemas            |
| **Autenticación**    | Email/Password + Sessions | Sin Clerk                    |
| **Git**              | GitHub API (Octokit)      | Repos por cliente            |
| **Deploy**           | Vercel                    | Build automático             |
| **Storage**          | Vercel Blob               | Imágenes y archivos          |

---

## 2. Arquitectura del Sistema

### 2.1 Arquitectura Híbrida

```
┌──────────────────────────────────────────────────────────────────────┐
│                           ARQUITECTURA SUMAQ                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│    ┌─────────────┐         ┌─────────────┐         ┌─────────────┐   │
│    │    CLIENT   │         │     CMS     │         │    GIT      │   │
│    │   (Editor)  │         │  (Nuxt.js)  │         │  (GitHub)   │   │
│    └──────┬──────┘         └──────┬──────┘         └──────┬──────┘   │
│           │                       │                       │          │
│           ▼                       ▼                       ▼          │
│    ┌─────────────┐         ┌─────────────┐         ┌─────────────┐   │
│    │  Form       │◄───────►│   Neon DB   │◄───────►│  Repos      │   │
│    │  Renderer   │         │  (Content)  │         │  (Files)    │   │
│    └─────────────┘         └─────────────┘         └──────┬──────┘   │
│                                                           │          │
│                                                           ▼          │
│                                                    ┌─────────────┐   │
│                                                    │   Vercel    │   │
│                                                    │  (Deploy)   │   │
│                                                    └─────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Flujo de Trabajo Core

1. **Edición**: Usuario edita contenido → se guarda en Neon via Drizzle ORM
2. **Publicación**: Botón "Publicar" → push automático y crea archivos en `cms/*.yaml` en repositorio del cliente
3. **Deployment**: Vercel detecta el push → inicia construcción automática
4. **Monitoreo**: CMS consulta estado del deployment en Vercel API

### 2.3 Estructura de Archivos CMS

El sistema utiliza una **separación clara entre esquemas y datos** que residen en el **repositorio del cliente**:

```
┌─────────────────────────────────────────────────────────────────┐
│           ARQUITECTURA DE ARCHIVOS CMS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Repositorio del Cliente (GitHub)                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  cms/                       src/data/                     │  │
│  │  ┌──────────────────┐       ┌──────────────────┐          │  │
│  │  │  ESQUEMAS YAML   │       │  DATOS JSON      │          │  │
│  │  │  (auto-descub.)  │       │  (contenido)     │          │  │
│  │  └──────────────────┘       └──────────────────┘          │  │
│  │                                                           │  │
│  │  - page.{name}.yaml      →  - {name}.json                 │  │
│  │  - blog.{name}.yaml      →  - {name}/{slug}.json          │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│           │                    │                                │
│           ▼                    ▼                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Acceso vía GitHub API (NO acceso HTTP público)            │ │
│  │  - Sumaq CMS lee/escribe mediante GitHub API               │ │
│  │  - Modificación vía aplicación o manualmente por devs      │ │
│  └────────────────────────────────────────────────────────────┘ │
│           │                                                     │
│           ▼                                                     │
│  app/assets/cms/                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  TEMPLATES (backup/referencia)                             │ │
│  │  (plantillas base para nuevos sitios)                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### ⚠️ Nota Importante sobre Rutas de Archivos

> **Las carpetas `cms/` y `src/data/` son parte del repositorio del cliente, NO carpetas de acceso público HTTP.**
>
> - Se acceden **únicamente vía GitHub API**, no directamente por HTTP
> - Se modifican **vía la aplicación CMS** o **manualmente por el desarrollador**
> - El usuario puede clonar su repositorio para editarlas localmente

#### Convenciones de Nomenclatura (CRÍTICAS)

| Tipo     | Schema Path            | Data Path                     | Ejemplo                                           |
| -------- | ---------------------- | ----------------------------- | ------------------------------------------------- |
| **Page** | `cms/page.{name}.yaml` | `src/data/{name}.json`        | `page.index.yaml` → `src/data/index.json`         |
| **Blog** | `cms/blog.{name}.yaml` | `src/data/{name}/{slug}.json` | `blog.posts.yaml` → `src/data/posts/my-post.json` |

**Regex de validación:** `/^(page|blog)\.(.+)\.yaml$/`

#### Estructura en Repositorio de Cliente (Astro)

```
mi-proyecto/
├── cms/                          # Esquemas YAML (RAÍZ del proyecto)
│   ├── page.index.yaml          # Página principal (homepage)
│   ├── page.about.yaml          # Página "Sobre nosotros"
│   ├── page.contact.yaml        # Página de contacto
│   ├── page.privacy.yaml        # Política de privacidad
│   ├── blog.posts.yaml          # Configuración de blog posts
│   ├── blog.categories.yaml     # Categorías del blog
│   └── ...
├── src/
│   ├── data/                    # Datos JSON (dentro de src/)
│   │   ├── index.json          # Contenido de homepage
│   │   ├── about.json          # Contenido de "Sobre nosotros"
│   │   ├── contact.json        # Contenido de contacto
│   │   └── posts/             # Posts del blog
│   │       ├── mi-primer-post.json
│   │       └── otro-post.json
│   ├── pages/                   # Páginas Astro
│   ├── layouts/                 # Layouts Astro
│   ├── components/              # Componentes Astro
│   └── env.d.ts
├── public/                      # Assets estáticos (CSS, JS, imágenes)
├── astro.config.mjs
├── package.json
└── ...
```

**Rutas específicas:**
| Tipo | Ruta | Descripción |
|------|------|-------------|
| **Schemas** | `/cms/` | Raíz del proyecto - esquemas YAML |
| **Datos** | `/src/data/` | Dentro de src - datos JSON |

**Convenciones de nomenclatura:**

| Type          | Descripción                                 | Ejemplo           |
| ------------- | ------------------------------------------- | ----------------- |
| `page.[name]` | Páginas estáticas (landing, about, contact) | `page.team.yaml`  |
| `blog.[name]` | Configuraciones de blog                     | `blog.posts.yaml` |

### 2.4 Componentes de la Arquitectura

**Arquitectura Dual:**

| Sistema                | Tecnología       | Descripción                                    |
| ---------------------- | ---------------- | ---------------------------------------------- |
| **Sumaq CMS**          | Nuxt 4 + Nuxt UI | Panel de administración (edición, publicación) |
| **Sitios de Clientes** | Astro            | Sitios web estáticos de los clientes           |

**Infraestructura CMS:**

| Capa             | Tecnología                 | Función                            |
| ---------------- | -------------------------- | ---------------------------------- |
| **Frontend CMS** | Nuxt 4 + Nuxt UI           | Interfaz de gestión administrativa |
| **API Layer**    | Nitro Server Routes        | Endpoints REST, lógica de negocio  |
| **Database**     | Neon PostgreSQL / PGlite   | Almacenamiento de contenido        |
| **ORM**          | Drizzle ORM                | Queries type-safe                  |
| **Auth**         | Sessions (nuxt-auth-utils) | Login con email/password           |
| **Media**        | Vercel Blob                | Almacenamiento de imágenes         |
| **Git**          | GitHub API                 | Sincronización de archivos         |
| **Deploy**       | Vercel                     | Hosting estático                   |

---

## 3. Sistema de Autenticación y Autorización

### 3.1 Sistema de Roles

El sistema implementa **cuatro roles jerárquicos**:

| Rol         | Descripción                                  | Permisos                                                               |
| ----------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| **Admin**   | Administradores del sistema (equipo interno) | Gestión completa, ve todos los sitios, gestión de usuarios             |
| **Owner**   | Propietarios de sitios web                   | Solo sus propios sitios, no ve sitios de otros                         |
| **Editor**  | Editores de contenido                        | Acceso restringido a sitios que les asignen, creados por admin u owner |
| **Partner** | Socios/afiliados                             | Acceso específico definido por admin                                   |

**Implementación de roles:**

```typescript
// En componentes Vue (useRole.ts)
const { user } = useUserSession()
const role = computed(() => user.value?.role)
const isAdmin = computed(() => role.value === 'admin')

// En API routes (patrón obligatorio)
const session = await requireUserSession(event)
if (session.user.role !== 'admin') {
  throw createError({ statusCode: 403 })
}
```

### 3.2 Middleware de Protección

| Middleware        | Rutas Protegidas                                                                       | Comportamiento                                   |
| ----------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `auth.global.ts`  | `/dashboard`, `/billing`, `/notifications`, `/settings`, `/site`, `/profile`, `/admin` | Redirige a `/login` si no hay sesión             |
| `admin.global.ts` | `/admin/*`                                                                             | Restringe acceso solo a usuarios con rol `admin` |

### 3.3 Endpoints de Autenticación

| Endpoint                         | Método         | Descripción                       |
| -------------------------------- | -------------- | --------------------------------- |
| `POST /api/auth/login`           | Login          | Iniciar sesión con email/password |
| `POST /api/auth/logout`          | Logout         | Cerrar sesión actual              |
| `GET /api/auth/me`               | Session        | Obtener datos del usuario actual  |
| `POST /api/auth/forgot-password` | Password Reset | Solicitar enlace de recuperación  |
| `POST /api/auth/reset-password`  | Password Reset | Establecer nueva contraseña       |

### 3.4 Gestión de Usuarios (Admin)

| Endpoint                      | Método | Descripción               |
| ----------------------------- | ------ | ------------------------- |
| `GET /api/admin/users`        | List   | Listar todos los usuarios |
| `POST /api/admin/users`       | Create | Crear nuevo usuario       |
| `PATCH /api/admin/users/:id`  | Update | Actualizar usuario        |
| `DELETE /api/admin/users/:id` | Delete | Eliminar usuario          |

---

## 4. Editor de Contenido Dinámico

### 4.1 Concepto: Form Renderer Schema-Driven

El corazón de Sumaq Sites es el **Form Renderer dinámico**, que genera automáticamente formularios de edición desde archivos YAML almacenados en el repositorio del cliente. Esta arquitectura permite definir nuevos tipos de contenido sin modificar código.

### 4.2 Pipeline Schema-to-Form (Detallado)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    PIPELINE: SCHEMA → FORM → DATA                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. CARGA DE SCHEMA                                                      │
│     ┌─────────────────────┐                                              │
│     │ YAML Schema File    │  public/cms/page.index.yaml                  │
│     │ {                   │  ┌─────────────────────────────────────┐     │
│     │   meta: [...],      │  │ meta:                               │     │
│     │   sections: {...}   │  │   - id: title                       │     │
│     │ }                   │  │     type: string                    │     │
│     └──────────┬──────────┘  │     label: Título                   │     │
│                │             └─────────────────────────────────────┘     │
│                ▼                                                         │
│  2. PARSEO                                                               │
│     ┌─────────────────────┐                                              │
│     │ usePageSchema.ts    │  Carga YAML con import ?raw                  │
│     │ useSchemaValidator  │  Convierte a Zod schema                      │
│     └──────────┬──────────┘                                              │
│                │                                                         │
│                ▼                                                         │
│  3. RENDERIZADO                                                          │
│     ┌─────────────────────────────────────────────┐                      │
│     │ DynamicForm.vue                             │                      │
│     │  ├─ UCard (header: icon + title)            │                      │
│     │  ├─ DynamicField.vue (field router)         │                      │
│     │  │    ├─ FieldString.vue                    │                      │
│     │  │    ├─ FieldTextRich.vue (TipTap)         │                      │
│     │  │    └─ FieldList.vue                      │                      │
│     │  └─ validationErrors map                    │                      │
│     └─────────────────────────────────────────────┘                      │
│                │                                                         │
│                ▼                                                         │
│  4. VALIDACIÓN                                                           │
│     ┌─────────────────────┐                                              │
│     │ Zod Validation      │  fieldTypeToZod() mapping                    │
│     │ - Real-time errors  │  string → z.string()                         │
│     │ - Path mapping      │  url → z.string().url()                      │
│     │ - Human-readable    │  list → z.array(z.object())                  │
│     └─────────────────────┘                                              │
│                │                                                         │
│                ▼                                                         │
│  5. PERSISTENCIA                                                         │
│     ┌─────────────────────┐                                              │
│     │ API + Data Layer    │                                              │
│     │ /api/cms/page/{name}│  PUT → src/data/{name}.json                  │
│     └─────────────────────┘                                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Sistema de Auto-Descubrimiento

El CMS implementa un sistema de **auto-descubrimiento de tipos de contenido**:

```typescript
// GET /api/cms
// Escanea public/cms/*.yaml → retorna lista de content types
// Regex: /^(page|blog)\.(.+)\.yaml$/
// Retorna: [{ type: 'page', name: 'index' }, { type: 'blog', name: 'posts' }]
```

**Tipos de contenido soportados:**

| Tipo   | Descripción       | Workflow                             |
| ------ | ----------------- | ------------------------------------ |
| `page` | Páginas estáticas | Schema → Data (1 archivo)            |
| `blog` | Blog posts        | Schema → Data (directorio con posts) |

### 4.4 Preview en Tiempo Real

El sistema incluye **PreviewPanel.vue** que genera iframe HTML desde formState:

```typescript
// buildPreviewHtml.ts
// Genera HTML desde el estado del formulario
// Soporta: gradientes, Tailwind classes, layouts responsivos
```

**Características del preview:**

- Actualización en tiempo real mientras se edita
- Soporta todos los campos del formulario
- Preview de layouts responsivos

### 4.5 Tipos de Campos Soportados

| Tipo      | Componente    | Descripción                                       | Validación Zod                             |
| --------- | ------------- | ------------------------------------------------- | ------------------------------------------ |
| `string`  | FieldString   | Campo de texto simple (UInput)                    | `z.string()`                               |
| `text`    | FieldTextRich | Texto enriquecido con TipTap (UEditor)            | `z.string()`                               |
| `number`  | FieldNumber   | Entrada numérica con validación                   | `z.number()`                               |
| `select`  | FieldSelect   | Dropdown con opciones predefinidas                | `z.enum(options)`                          |
| `url`     | FieldUrl      | URL con validación (absolutas, relativas, anclas) | `z.string().refine(isUrlOrRelativeAnchor)` |
| `image`   | FieldImage    | URL de imagen con preview de thumbnail            | `z.string().url()`                         |
| `list`    | FieldList     | Arrays dinámicos con campos anidados              | `z.array(z.object())`                      |
| `media`   | FieldMedia    | Selector de tipo (image/video) con metadatos      | `z.object({...})`                          |
| `boolean` | FieldBoolean  | Checkbox/Switch                                   | `z.boolean()`                              |
| `date`    | FieldDate     | Selector de fechas                                | `z.string()` (ISO 8601)                    |

#### Ejemplo de Validación URL

```typescript
// Validación flexible que acepta:
// - URLs absolutas: https://example.com
// - Rutas relativas: /about, /blog/post
// - Anclas: #top, #section
// - Nombres simples: about, contact
.refine(isUrlOrRelativeAnchor, 'Debe ser una URL válida o ruta relativa')
```

### 4.6 Error Reporting Detallado

El sistema proporciona mensajes de error con **rutas legibles para humanos**:

```yaml
# Ejemplo de estructura
sections:
  about:
    features:
      - title: Feature 1

# Error path: sections.about.features.0.title
# Human label: "Sección About → Features → Ítem 1 → Title"
```

**Propiedades:**

- Mapeo automático de paths a etiquetaslegibles
- Soporte para arrays e índices
- Contextualización por sección

### 4.7 Componentes del Editor

| Archivo                                  | Propósito                                      |
| ---------------------------------------- | ---------------------------------------------- |
| `app/composables/usePageSchema.ts`       | Carga esquemas YAML (legacy: app/assets/data/) |
| `app/composables/useSchemaValidator.ts`  | Genera validadores Zod desde esquemas          |
| `app/composables/useContentTypes.ts`     | Descubre content types desde public/cms/       |
| `app/components/Editor/DynamicForm.vue`  | Renderiza formulario completo con secciones    |
| `app/components/Editor/DynamicField.vue` | Enruta al componente correcto según tipo       |
| `app/components/Editor/Field*.vue`       | Componentes individuales por tipo de campo     |
| `app/pages/editor.vue`                   | Editor legacy (usa app/assets/data/)           |
| `app/pages/content.vue`                  | Gestor de tipos de contenido                   |
| `app/utils/buildPreviewHtml.ts`          | Genera HTML para iframe preview                |

### 4.8 Ejemplo de Esquema YAML

#### Ejemplo Real (`cms/page.index.yaml`)

```yaml
meta:
  name: metadata
  label: Metadata
  description: Configuration schema for CMS pages
  fields:
    - id: title
      label: Title
      type: string
    - id: description
      label: Description
      type: string
brand:
  id: brand
  label: Brand
  description: Configuration schema for brand information
  fields:
    - id: name
      label: Name
      type: string
    - id: logo
      label: Logo
      type: image
    - id: link
      label: Link
      type: url
navigation:
  id: navigation
  label: Navigation
  description: Configuration schema for navigation menu
  fields:
    - id: items
      label: Menu Items
      type: list
      fields:
        - id: label
          label: Label
          type: string
        - id: link
          label: Link
          type: url
welcome:
  id: welcome
  label: Welcome
  description: Configuration schema for welcome section
  fields:
    - id: id
      label: ID
      type: string
    - id: title
      label: Title
      type: string
    - id: description
      label: Description
      type: string
about:
  id: about
  label: About
  description: Configuration schema for about section
  fields:
    - id: id
      label: ID
      type: string
    - id: title
      label: Title
      type: string
    - id: description
      label: Description
      type: string
    - id: content
      label: Rich Content
      type: richtext
    - id: category
      label: Category
      type: select
      options:
        values: [Tech, News, Sports]
    - id: author
      label: Author
      type: select
      options:
        values:
          - value: bob
            label: Bob Smith
          - value: patricia
            label: Patricia Wills
          - value: alice
            label: Alice Brown
    - id: tags
      label: Tags
      type: select
      options:
        multiple: true
        values: [Tech, News, Sports, Business, Entertainment]
    - id: features
      label: Features
      type: list
      fields:
        - id: title
          label: Title
          type: string
        - id: description
          label: Description
          type: string
profile:
  id: profile
  label: Profile
  description: Configuration schema for profile section
  fields:
    - id: id
      label: ID
      type: string
    - id: title
      label: Title
      type: string
    - id: contact
      label: Contacto
      type: object
      fields:
        - id: email
          label: Email
          type: string
        - id: phone
          label: Teléfono
          type: string
        - id: address
          label: Dirección
          type: object
          fields:
            - id: email
              label: Email
              type: string
            - id: city
              label: Ciudad
              type: string
footer:
  id: footer
  label: Footer
  description: Configuration schema for footer section
  fields:
    - id: copy
      label: Copyright Text
      type: string
    - id: legal
      label: Legal Links
      type: list
      fields:
        - id: label
          label: Label
          type: string
        - id: link
          label: Link
          type: url
```

#### Resultado JSON Correspondiente (`src/data/index.json`)

```json
{
  "meta": {
    "title": "Página de ejemplo",
    "description": "Esta es una página de ejemplo para demostrar la estructura YAML."
  },
  "brand": {
    "name": "EjemploMarca",
    "logo": "https://placehold.co/100x100",
    "link": "/"
  },
  "navigation": {
    "items": [
      { "label": "About me", "link": "/about", "order": 0 },
      { "label": "Contacto", "link": "/contact", "order": 1 },
      { "label": "Home", "link": "/", "order": 2 }
    ]
  },
  "welcome": {
    "id": "welcome",
    "title": "Bienvenido a la Página de Ejemplo",
    "description": "Esta sección de bienvenida introduce a los usuarios a la página."
  },
  "about": {
    "id": "about",
    "title": "Acerca de",
    "description": "Esta sección describe sobre la página.",
    "content": "<h2>Bienvenido al Editor Rico</h2><p>Este es un ejemplo de <strong>texto enriquecido</strong>...</p>",
    "category": "News",
    "author": "patricia",
    "tags": ["Tech", "News", "Sports"],
    "features": [
      {
        "title": "Característica 1",
        "description": "Descripción de la característica 1.",
        "order": 0
      }
    ]
  },
  "profile": {
    "id": "profile",
    "title": "Perfil",
    "contact": {
      "email": "ejemplo@email.com",
      "phone": "+1234567890",
      "address": { "city": "Graz" }
    }
  },
  "footer": {
    "copy": "© 2026 EjemploMarca. Todos los derechos reservados.",
    "legal": [{ "label": "Datenschutz", "link": "/datenschutz", "order": 0 }]
  }
}
```

**Nota:** Estos archivos de ejemplo (`page.example.yaml` y `page.example.json`) demuestran la estructura típica de un esquema YAML y su correspondiente JSON para datos.

### 4.9 Validación Inteligente

El sistema proporciona validación runtime con Zod schemas generados dinámicamente:

- Feedback inmediato a nivel de campo
- Mensajes de error contextuales
- Rutas legibles en reportes (ej: "Hero → Título")
- Validación de tipos, longitud, formatos

### 4.10 Agregar Nuevos Tipos de Campo

Para añadir un nuevo tipo de campo:

```typescript
// 1. Crear componente: app/components/Editor/FieldMyType.vue
<template>
  <div>
    <UInput v-model="value" />
    <span v-if="error" class="text-red-500">{{ error }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  field: SchemaField
  modelValue: any
  error?: string
}>()

const emit = defineEmits(['update:model-value'])
</script>

// 2. Agregar validación en useSchemaValidator.ts
case 'mytype':
  return z.string().transform(val => processValue(val))

// 3. Registrar en DynamicField.vue
<FieldMyType v-if="field.type === 'mytype'" ... />
```

---

## 5. Arquitectura de API Dual

El CMS implementa una **arquitectura de API dual**:

### 5.1 Legacy API

**Endpoint:** `server/api/page.ts`

- **GET /api/page**: Retorna `app/assets/data/page.json`
- **PUT /api/page**: Escribe a `app/assets/data/page.json`
- Usado por editor legacy (`app/pages/editor.vue`)

### 5.2 Modern CMS API

**Endpoint base:** `server/api/cms/`

| Endpoint                      | Método       | Descripción                                            |
| ----------------------------- | ------------ | ------------------------------------------------------ |
| `/api/cms`                    | GET          | Descubre todos los content types (escanea cms/\*.yaml) |
| `/api/cms/page/{name}`        | GET/PUT      | Cargar/actualizar página                               |
| `/api/cms/blog/{name}`        | GET          | Listar todos los posts de blog                         |
| `/api/cms/blog/{name}/{slug}` | GET/POST/PUT | CRUD de blog post                                      |
| `/api/upload`                 | POST         | Upload de archivos (imágenes)                          |

### 5.3 Patrón de Manejo HTTP

```typescript
export default defineEventHandler(async (event) => {
  const method = event.node.req.method

  if (method === 'GET') return handleGet(event)
  if (method === 'PUT') return handlePut(event)
  if (method === 'POST') return handlePost(event)

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed',
  })
})
```

### 5.4 Códigos de Error HTTP

| Código  | Uso                                         |
| ------- | ------------------------------------------- |
| **400** | Request body o parámetros inválidos         |
| **404** | Schema o archivo de contenido no encontrado |
| **405** | Método HTTP no permitido                    |
| **409** | Conflicto (ej: slug de blog post ya existe) |
| **500** | Error del servidor, problemas de filesystem |

### 5.5 Patrón de Persistencia de Datos

```typescript
import fs from 'fs'
import { join } from 'path'

// Lectura
const dataPath = join(process.cwd(), 'src/data', `${name}.json`)
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

// Escritura
const dirPath = join(process.cwd(), 'src/data', name)
fs.mkdirSync(dirPath, { recursive: true }) // Crear directorio si no existe
fs.writeFileSync(
  join(dirPath, `${slug}.json`),
  JSON.stringify(body, null, 2), // JSON pretty-print
  'utf-8',
)
```

---

## 6. Dashboard Principal

### 6.1 Funcionalidades del Dashboard (`/dashboard`)

El dashboard es el centro de control del CMS y muestra:

- **Lista de sitios web** del usuario en sesión
- **Vista de Admin:** ve todos los sitios del sistema
- **Vista de Owner:** solo sus propios sitios
- **Vista de Editor:** solo sitios asignados
- **Estado de deployment** de cada sitio (building, ready, error)
- **Enlace directo** a cada sitio web publicado
- **Información básica:** nombre, URL, última actualización

### 6.2 Estados de Deployment

| Estado     | Descripción        | Color UI |
| ---------- | ------------------ | -------- |
| `building` | Build en progreso  | Amarillo |
| `ready`    | Deploy exitoso     | Verde    |
| `error`    | Error en build     | Rojo     |
| `queued`   | En cola para build | Gris     |

### 6.3 Gestión de Sitios

| Operación        | Descripción                                      |
| ---------------- | ------------------------------------------------ |
| **Crear**        | Modal con nombre y template (therapy/blog/blank) |
| **Listar**       | Grid de cards con thumbnail, nombre, estado      |
| **Ver detalles** | Página con métricas, configuración, preview      |
| **Configurar**   | Settings de sitio (nombre, dominio, GitHub repo) |
| **Archivar**     | Soft delete (status = archived)                  |
| **Eliminar**     | Hard delete con confirmación                     |

---

## 7. Integración Vercel/GitHub

### 7.1 GitHub Integration

#### Flujo de Conexión

1. Owner hace clic en "Conectar GitHub"
2. CMS inicia OAuth flow con GitHub App
3. Usuario autoriza instalación en su cuenta
4. CMS guarda installation_id en base de datos
5. CMS puede acceder a repos del usuario

#### Operaciones Git

| Operación  | Descripción                                      |
| ---------- | ------------------------------------------------ |
| **Clone**  | Clonar repositorio para lectura/escritura        |
| **Read**   | Leer archivos `cms/*.yaml` para parsear esquemas |
| **Write**  | Commit y push de archivos `cms/*.yaml`           |
| **Status** | Consultar estado de repositorio                  |

### 7.2 Vercel Integration

#### Monitoreo de Deployments

El CMS consulta Vercel API para mostrar estado de deployments:

```typescript
interface Deployment {
  id: string
  status: 'BUILDING' | 'READY' | 'ERROR' | 'QUEUED'
  url: string
  createdAt: Date
  readyAt?: Date
}
```

#### Endpoints Planificados

| Endpoint                              | Método  | Descripción                     |
| ------------------------------------- | ------- | ------------------------------- |
| `GET /api/vercel/deployments/:siteId` | List    | Listar deployments de un sitio  |
| `GET /api/vercel/deployments/:id`     | Get     | Estado de deployment específico |
| `POST /api/vercel/redeploy/:siteId`   | Trigger | Forzar redeploy                 |

### 7.3 Sistema de Publicación

El workflow de publicación sincroniza base de datos con repositorio Git:

```
1. Usuario hace clic en "Publicar" en el editor
2. CMS obtiene content_json de la página desde Neon
3. CMS genera archivo YAML formateado
4. CMS lee archivo cms/[type].[name].yaml del repositorio GitHub
5. Si existe, verificar que no hay conflictos (comparar timestamps)
6. CMS hace commit del archivo actualizado
7. CMS hace push a GitHub
8. GitHub webhook notifica a Vercel
9. Vercel ejecuta build de Astro/Next.js
10. Vercel hace deploy a edge
11. CMS actualiza status de página a "published"
12. CMS registra en activity_logs
13. UI muestra notificación de éxito
```

---

## 8. Modelo de Datos

### 8.1 Esquema de Base de Datos (Drizzle ORM)

```typescript
// Tablas principales

users: {
  id: serial primary key,
  email: text unique not null,
  password: text not null,           // bcrypt hashed
  name: text,
  role: enum('admin', 'owner', 'editor'),
  github_data: jsonb,                // { installationId, accountType }
  created_at: timestamp,
  updated_at: timestamp
}

sites: {
  id: uuid primary key,
  owner_id: integer references users(id),
  name: text not null,
  slug: text unique,
  github_repo_url: text,
  github_branch: text default 'main',
  vercel_project_id: text,
  vercel_url: text,
  template: text default 'blank',
  status: enum('active', 'archived'),
  created_at: timestamp,
  updated_at: timestamp
}

site_members: {
  site_id: uuid references sites(id),
  user_id: integer references users(id),
  role: enum('owner', 'editor'),
  created_at: timestamp
}

pages: {
  id: uuid primary key,
  site_id: uuid references sites(id),
  type: text,                        // 'page' o 'blog'
  name: text,                        // ej: 'index', 'about'
  title: text,
  content_json: jsonb,
  status: enum('draft', 'published'),
  published_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp
}

media: {
  id: uuid primary key,
  site_id: uuid references sites(id),
  filename: text not null,
  url: text not null,
  thumbnail_url: text,
  size_bytes: integer,
  mime_type: text,
  dimensions: jsonb,                 // { width, height }
  created_at: timestamp
}

activity_logs: {
  id: serial primary key,
  user_id: integer references users(id),
  site_id: uuid references sites(id),
  action: text not null,             // 'login', 'publish', 'create_page'
  details: jsonb,
  ip_address: text,
  created_at: timestamp
}

audit_logs: {
  id: serial primary key,
  user_id: integer references users(id),
  action: text not null,
  target_type: text,                 // 'user', 'site', 'page'
  target_id: uuid,
  changes: jsonb,
  created_at: timestamp
}

password_resets: {
  id: serial primary key,
  user_id: integer references users(id),
  token: text unique not null,
  expires_at: timestamp not null,
  created_at: timestamp
}
```

### 8.2 Índices Recomendados

```sql
-- Índices para queries frecuentes
CREATE INDEX idx_pages_site_id ON pages(site_id);
CREATE INDEX idx_pages_status ON pages(status);
CREATE INDEX idx_sites_owner_id ON sites(owner_id);
CREATE INDEX idx_activity_logs_site_id ON activity_logs(site_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);

-- GIN index para búsqueda en JSONB
CREATE INDEX idx_pages_content_json ON pages USING GIN (content_json);
```

---

## 9. Templates de Sitio

### 9.1 Template: Therapy

Diseñado para profesionales de salud mental y terapeutas.

**Estructura de páginas:**

```yaml
cms/
├── page.index.yaml      # Homepage
├── page.about.yaml      # Sobre mí
├── page.services.yaml   # Servicios ofrecidos
├── page.blog.yaml       # Blog listing
├── page.contact.yaml    # Formulario de contacto
├── page.privacy.yaml    # Política de privacidad
└── blog.posts.yaml      # Configuración de posts
```

**Campos típicos:**

- Hero: nombre, título, foto, descripción breve
- About: biografía, educación, certificaciones
- Services: lista de servicios con nombre, descripción, duración, precio
- Testimonials: testimonios de clientes (opcional)
- Contact: información de contacto, horarios
- Blog: configuración de posts con título, contenido rich text, fecha

### 9.2 Template: Blog

Diseñado para bloggers y creadores de contenido.

**Estructura de páginas:**

```yaml
cms/
├── page.index.yaml      # Homepage con últimos posts
├── page.blog.yaml       # Lista de posts
├── page.about.yaml      # Sobre el autor
├── page.contact.yaml    # Contacto
└── blog.posts.yaml      # Posts individuales
```

**Campos típicos:**

- Post: título, slug, contenido rich text, fecha, tags, imagen destacada
- Author: nombre, bio, foto, redes sociales
- Category: nombre, slug, descripción

### 9.3 Template: Blank

Punto de partida minimalista para personalización total.

**Estructura inicial:**

```yaml
cms/
├── page.index.yaml      # Homepage básica
└── blog.posts.yaml      # Configuración de blog (opcional)
```

---

## 10. Internacionalización (i18n)

### 10.1 Idiomas Soportados

El CMS implementa i18n con soporte para:

| Código | Idioma  | Estado          |
| ------ | ------- | --------------- |
| `es`   | Español | ✅ Implementado |
| `en`   | Inglés  | ✅ Implementado |
| `de`   | Alemán  | ✅ Implementado |

### 10.2 Configuración

- **Estrategia:** `no_prefix` (URLs sin prefijo de idioma)
- **Detección:** Idioma del navegador
- **Persistencia:** Cookie de preferencia
- **Framework:** `@nuxtjs/i18n`

---

## 11. Diseño y UI

### 11.1 Dirección de Diseño Recomendada

Dado que no hay un branding definido aún, recomiendo establecer una identidad visual profesional y moderna:

#### Paleta de Colores

| Rol                  | Color                    | Uso                        |
| -------------------- | ------------------------ | -------------------------- |
| **Primario**         | `#b91c1c` (Rojo oscuro)  | CTAs principales, acciones |
| **Secundario**       | `#1e293b` (Slate oscuro) | Headers, texto importante  |
| **Acento**           | `#3b82f6` (Azul)         | Links, estados activos     |
| **Fondo**            | `#ffffff` (Blanco)       | Fondo principal            |
| **Fondo secundario** | `#f8fafc` (Slate 50)     | Cards, secciones alternas  |
| **Texto**            | `#334155` (Slate 700)    | Cuerpo de texto            |
| **Texto secundario** | `#64748b` (Slate 500)    | Placeholder, hints         |

#### Tipografía

| Elemento    | Font           | Weight | Size    |
| ----------- | -------------- | ------ | ------- |
| Headings    | Inter          | 700    | 24-32px |
| Subheadings | Inter          | 600    | 18-20px |
| Body        | Inter          | 400    | 14-16px |
| Labels      | Inter          | 500    | 12-14px |
| Code/Schema | JetBrains Mono | 400    | 13px    |

#### Principios de Diseño

1. **Minimalismo**: Espacios amplios, elementos focales
2. **Claridad**: Jerarquía visual clara, icons consistentes
3. **Consistencia**: Componentes Nuxt UI, patrones repetibles
4. **Accesibilidad**: Contraste WCAG AA, focus states

### 11.2 Componentes UI Principales

El sistema utiliza componentes de Nuxt UI para mantener coherencia:

| Componente             | Uso                        |
| ---------------------- | -------------------------- |
| `UButton`              | CTAs, acciones principales |
| `UInput`, `UTextarea`  | Formularios de texto       |
| `USelect`, `UCheckbox` | Selecciones múltiples      |
| `UEditor`              | Rich text con TipTap       |
| `UTable`               | Listas de datos            |
| `UCard`                | Contenedores de contenido  |
| `UModal`               | Diálogos, confirmaciones   |
| `UAlert`               | Notificaciones, errores    |
| `UTabs`                | Navegación entre secciones |
| `UDropdown`            | Menús contextuales         |

### 11.3 Layout Principal

```
┌─────────────────────────────────────────────────────────────┐
│ Navbar (logo, búsqueda, usuario, notificaciones)            │
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│  Sidebar   │              Main Content Area                 │
│            │                                                │
│  - Sites   │  ┌────────────────────────────────────────┐   │
│  - Pages   │  │         Page Header + Actions         │   │
│  - Media   │  ├────────────────────────────────────────┤   │
│  - Settings│  │                                        │   │
│            │  │              Content                  │   │
│            │  │                                        │   │
│            │  └────────────────────────────────────────┘   │
│            │                                                │
├────────────┴────────────────────────────────────────────────┤
│ Footer (minimal, links legales)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. Funcionalidades MVP

### 12.1 Funcionalidades Prioritarias (P0)

> **NOTA:** Todos los estados están marcados como **⏳ Pendiente de implementar** ya que el proyecto se reiniciará con vibe coding.

| #   | Funcionalidad                | Descripción                                   | Estado |
| --- | ---------------------------- | --------------------------------------------- | ------ |
| 1   | Estructura base del proyecto | Nuxt 4 + Nuxt UI + Drizzle configurados       | ⏳     |
| 2   | Schema de base de datos      | Tablas para users, sites, pages, media        | ⏳     |
| 3   | Sistema de autenticación     | Login/logout con roles (Admin/Owner/Editor)   | ⏳     |
| 4   | Dashboard principal          | Lista de sitios según rol de usuario          | ⏳     |
| 5   | Gestión de sitios            | CRUD de sitios (crear, listar, ver, archivar) | ⏳     |
| 6   | Editor visual de contenido   | Form Renderer dinámico con tipos básicos      | ⏳     |
| 7   | Layout y navegación          | Sidebar, navbar, responsive                   | ⏳     |
| 8   | Multiidioma                  | Soporte ES/EN/DE con @nuxtjs/i18n             | ⏳     |
| 9   | GitHub OAuth                 | Conexión con repositorios del cliente         | ⏳     |
| 10  | GitHub integration básica    | Leer/escribir archivos cms/\*.yaml            | ⏳     |
| 11  | Vercel API integration       | Consultar estado de deployments               | ⏳     |
| 12  | Preview avanzado             | iframe mostrando preview del sitio            | ⏳     |

### 12.2 Funcionalidades Pendientes

| #   | Funcionalidad                  | Prioridad | Estimación |
| --- | ------------------------------ | --------- | ---------- |
| 13  | Publish system completo        | P1        | 1 semana   |
| 14  | Media Manager (upload/galería) | P1        | 3-4 días   |
| 15  | Analytics dashboard            | P2        | 2-3 días   |
| 16  | Conflict detection (Git sync)  | P2        | 2-3 días   |
| 17  | Activity logs UI               | P2        | 1-2 días   |
| 18  | Onboarding flow                | P3        | 2-3 días   |

### 12.3 Próximo Paso: Vibe Coding

> **El proyecto será recreado utilizando vibe coding** - un enfoque de desarrollo asistido por IA donde las especificaciones y documentación servirán como base para generar código de manera automatizada.

---

## 13. Convenciones de Código

### 13.1 Convenciones de Estilo

| Aspecto          | Regla                                                       |
| ---------------- | ----------------------------------------------------------- |
| **Comillas**     | Comillas simples en JS/TS, comillas dobles en templates Vue |
| **Punto y coma** | Sin punto y coma                                            |
| **Formato**      | Comas finales nunca (trailing commas)                       |
| **Componentes**  | Usar sintaxis `<script setup>`                              |
| **Auto-import**  | Componentes y composables auto-importados                   |

### 13.2 Convenciones de Archivos

| Tipo          | Convención         | Ejemplo                              |
| ------------- | ------------------ | ------------------------------------ |
| API routes    | `[name].METHOD.ts` | `login.post.ts`, `users.get.ts`      |
| Files/folders | kebab-case         | `auth.global.ts`, `main-sidebar.vue` |
| Componentes   | PascalCase         | `MainPanelNavbar.vue`                |
| Composables   | prefijo `use*`     | `useRole.ts`, `useGitHub.ts`         |

### 13.3 Patrón de API Route

```typescript
export default defineEventHandler(async (event) => {
  // 1. Validación con Zod
  const body = await readBody(event)
  const data = yourSchema.parse(body)

  // 2. Requerir sesión
  const session = await requireUserSession(event)

  // 3. Verificar roles
  if (session.user.role !== 'admin') {
    throw createError({ statusCode: 403 })
  }

  // 4. Operaciones de base de datos
  const db = useDrizzle()
  const result = await db.insert(...).values(data)

  // 5. Logging de auditoría
  await createAuditLog(session.user.id, 'action', {...}, event)

  // 6. Retornar respuesta
  return result
})
```

### 13.4 Patrones de Composable

```typescript
// useRole.ts
const { user } = useUserSession()
const role = computed(() => user.value?.role)
const isAdmin = computed(() => role.value === 'admin')
const isOwner = computed(() => role.value === 'owner')
const isEditor = computed(() => role.value === 'editor')
```

### 13.5 Middleware de Rutas

```typescript
// auth.global.ts
// Patrón regex para rutas protegidas
// Redirige a /login si no hay sesión

// admin.global.ts
// Rutas /admin/* solo para role === 'admin'
```

### 13.6 Testing

```bash
pnpm test              # Todos los tests
pnpm test:unit         # Tests unitarios (Vitest, node env)
pnpm test:nuxt         # Tests de componentes (happy-dom)
pnpm test:e2e          # Playwright E2E
pnpm test:watch        # Watch mode durante desarrollo
```

---

## 14. Estructura de Archivos del Proyecto

```
sumaq-sites/
├── app/
│   ├── pages/
│   │   ├── index.vue                 # Landing page
│   │   ├── login.vue                 # Login
│   │   ├── register.vue              # Registro
│   │   ├── dashboard.vue             # Dashboard principal
│   │   ├── sites/
│   │   │   ├── index.vue             # Lista de sitios
│   │   │   ├── [id]/
│   │   │   │   ├── index.vue         # Detalle del sitio
│   │   │   │   ├── pages/
│   │   │   │   │   ├── index.vue     # Lista de páginas
│   │   │   │   │   ├── [pageId]/
│   │   │   │   │   │   └── edit.vue  # Editor de página
│   │   │   │   └── settings.vue      # Configuración
│   │   │   └── new.vue               # Crear sitio
│   │   ├── media/
│   │   │   └── index.vue             # Gestor de media
│   │   └── admin/
│   │       ├── index.vue             # Panel admin
│   │       └── users/
│   │           ├── index.vue         # Gestión de usuarios
│   │           └── [id]/edit.vue     # Editar usuario
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppNavbar.vue
│   │   │   ├── AppSidebar.vue
│   │   │   └── AppFooter.vue
│   │   ├── sites/
│   │   │   ├── SiteCard.vue
│   │   │   ├── SiteForm.vue
│   │   │   └── SiteStats.vue
│   │   ├── editor/
│   │   │   ├── DynamicForm.vue
│   │   │   ├── DynamicField.vue
│   │   │   ├── FieldString.vue
│   │   │   ├── FieldTextRich.vue
│   │   │   ├── FieldNumber.vue
│   │   │   ├── FieldSelect.vue
│   │   │   ├── FieldUrl.vue
│   │   │   ├── FieldImage.vue
│   │   │   ├── FieldList.vue
│   │   │   ├── FieldMedia.vue
│   │   │   └── FieldBoolean.vue
│   │   └── ui/
│   │       ├── StatusBadge.vue
│   │       ├── EmptyState.vue
│   │       └── LoadingSpinner.vue
│   ├── composables/
│   │   ├── useAuth.ts
│   │   ├── useSites.ts
│   │   ├── usePages.ts
│   │   ├── useSchema.ts
│   │   ├── usePageSchema.ts
│   │   ├── useSchemaValidator.ts
│   │   └── useGitHub.ts
│   ├── middleware/
│   │   ├── auth.global.ts
│   │   └── admin.global.ts
│   ├── assets/
│   │   └── css/
│   │       └── main.css
│   └── i18n/
│       ├── es.json
│       ├── en.json
│       └── de.json
├── server/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.post.ts
│   │   │   ├── logout.post.ts
│   │   │   ├── me.get.ts
│   │   │   ├── forgot-password.post.ts
│   │   │   └── reset-password.post.ts
│   │   ├── admin/
│   │   │   └── users/
│   │   │       ├── index.get.ts
│   │   │       ├── index.post.ts
│   │   │       ├── [id].patch.ts
│   │   │       └── [id].delete.ts
│   │   ├── sites/
│   │   │   ├── index.get.ts
│   │   │   ├── index.post.ts
│   │   │   ├── [id].get.ts
│   │   │   ├── [id].patch.ts
│   │   │   └── [id].delete.ts
│   │   ├── pages/
│   │   │   ├── [siteId].get.ts
│   │   │   ├── [siteId].post.ts
│   │   │   ├── [siteId]/[pageId].get.ts
│   │   │   ├── [siteId]/[pageId].put.ts
│   │   │   └── [siteId]/[pageId].delete.ts
│   │   ├── github/
│   │   │   ├── status.get.ts
│   │   │   ├── connect.get.ts
│   │   │   ├── callback.get.ts
│   │   │   ├── disconnect.post.ts
│   │   │   ├── repos.get.ts
│   │   │   └── files/
│   │   │       ├── [siteId].get.ts
│   │   │       └── [siteId].put.ts
│   │   ├── vercel/
│   │   │   └── deployments/
│   │   │       └── [siteId].get.ts
│   │   └── health/
│   │       ├── db.get.ts
│   │       └── blob.get.ts
│   ├── db/
│   │   ├── schema.ts
│   │   ├── index.ts
│   │   └── migrations/
│   └── utils/
│       ├── password.ts
│       ├── audit.ts
│       └── github.ts
├── shared/
│   └── types/
│       ├── user.ts
│       ├── site.ts
│       ├── page.ts
│       └── schema.ts
├── docs/
│   └── Sumaq_Sites_Documento_Consolidado.md
├── .env.example
├── nuxt.config.ts
├── drizzle.config.ts
├── package.json
└── README.md
```

---

## 15. Variables de Entorno

### 15.1 Obligatorias

```bash
# Sesión (requerida para nuxt-auth-utils)
NUXT_SESSION_PASSWORD=<32-byte-base64-string>

# GitHub App (requerida para integración Git)
GITHUB_APP_ID=<app-id-from-github>
GITHUB_PRIVATE_KEY=<private-key-pem>
GITHUB_CLIENT_ID=<oauth-client-id>
GITHUB_CLIENT_SECRET=<oauth-client-secret>
GITHUB_TOKEN_ENCRYPTION_KEY=<hex-key-for-aes-256-gcm>
```

### 15.2 Opcionales

```bash
# Base de datos (producción)
DATABASE_URL=postgresql://user:password@host.neon.tech/db?sslmode=require

# Blob storage (producción)
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>

# Desarrollo sin estas variables usa PGlite y filesystem local
```

---

## 16. API Endpoints Completos

### 16.1 Autenticación

| Endpoint                    | Método | Descripción              | Auth |
| --------------------------- | ------ | ------------------------ | ---- |
| `/api/auth/login`           | POST   | Login con email/password | No   |
| `/api/auth/logout`          | POST   | Cerrar sesión            | Sí   |
| `/api/auth/me`              | GET    | Obtener usuario actual   | Sí   |
| `/api/auth/forgot-password` | POST   | Solicitar reset          | No   |
| `/api/auth/reset-password`  | POST   | Resetear contraseña      | No   |

### 16.2 Administración (Admin)

| Endpoint               | Método | Descripción        | Auth  |
| ---------------------- | ------ | ------------------ | ----- |
| `/api/admin/users`     | GET    | Listar usuarios    | Admin |
| `/api/admin/users`     | POST   | Crear usuario      | Admin |
| `/api/admin/users/:id` | PATCH  | Actualizar usuario | Admin |
| `/api/admin/users/:id` | DELETE | Eliminar usuario   | Admin |

### 16.3 Sitios

| Endpoint         | Método | Descripción                      | Auth    |
| ---------------- | ------ | -------------------------------- | ------- |
| `/api/sites`     | GET    | Listar sitios (filtrado por rol) | Sí      |
| `/api/sites`     | POST   | Crear sitio                      | Owner+  |
| `/api/sites/:id` | GET    | Ver sitio                        | Miembro |
| `/api/sites/:id` | PATCH  | Actualizar sitio                 | Owner   |
| `/api/sites/:id` | DELETE | Archivar sitio                   | Owner   |

### 16.4 Páginas

| Endpoint                     | Método | Descripción              | Auth    |
| ---------------------------- | ------ | ------------------------ | ------- |
| `/api/pages/:siteId`         | GET    | Listar páginas del sitio | Miembro |
| `/api/pages/:siteId`         | POST   | Crear página             | Editor+ |
| `/api/pages/:siteId/:pageId` | GET    | Ver página               | Miembro |
| `/api/pages/:siteId/:pageId` | PUT    | Actualizar página        | Editor+ |
| `/api/pages/:siteId/:pageId` | DELETE | Eliminar página          | Editor+ |

### 16.5 GitHub

| Endpoint                    | Método | Descripción                   | Auth    |
| --------------------------- | ------ | ----------------------------- | ------- |
| `/api/github/status`        | GET    | Estado de conexión            | Sí      |
| `/api/github/connect`       | GET    | Iniciar OAuth                 | Sí      |
| `/api/github/callback`      | GET    | OAuth callback                | No      |
| `/api/github/disconnect`    | POST   | Desconectar                   | Owner   |
| `/api/github/repos`         | GET    | Listar repos                  | Sí      |
| `/api/github/files/:siteId` | GET    | Leer archivos cms/\*.yaml     | Miembro |
| `/api/github/files/:siteId` | PUT    | Escribir archivos cms/\*.yaml | Editor+ |

### 16.6 Vercel

| Endpoint                          | Método | Descripción        | Auth    |
| --------------------------------- | ------ | ------------------ | ------- |
| `/api/vercel/deployments/:siteId` | GET    | Listar deployments | Miembro |
| `/api/vercel/deployments/:id`     | GET    | Ver deployment     | Miembro |
| `/api/vercel/redeploy/:siteId`    | POST   | Trigger redeploy   | Owner   |

### 16.7 Health

| Endpoint           | Método | Descripción         | Auth |
| ------------------ | ------ | ------------------- | ---- |
| `/api/health/db`   | GET    | Estado database     | No   |
| `/api/health/blob` | GET    | Estado blob storage | No   |

---

## 17. Casos de Uso Detallados

### 17.1 Caso: Terapeuta Crea Sitio

**Actor:** María, terapeuta sin conocimientos técnicos

**Flujo:**

1. María accede a `sumaq-sites.com` y hace clic en "Registrarse"
2. Completa formulario con email, contraseña, nombre
3. Sistema crea usuario con rol "Owner"
4. Dashboard muestra "Crea tu primer sitio"
5. María hace clic en "Nuevo sitio"
6. Modal: nombre "María García Terapia", template "Therapy"
7. Sistema crea registro en DB, muestra sitio en dashboard
8. María ve secciones: Homepage, About, Services, Contact
9. María hace clic en "Services"
10. Editor muestra formulario con campos: nombre, descripción, precio
11. María edita, auto-save cada 3s guarda en DB
12. María hace clic en "Publicar"
13. Sistema genera `cms/page.services.yaml` y lo push a GitHub
14. Vercel detecta cambios, hace build, deploya
15. María recibe notificación: "¡Publicado!"

### 17.2 Caso: Editor Modifica Blog Post

**Actor:** Juan, editor asignado a sitio de María

**Flujo:**

1. Juan recibe email de María con enlace de acceso
2. Juan hace login con sus credenciales
3. Dashboard muestra sitio de María (no ve otros sitios)
4. Juan navega a Pages → Blog
5. Editor muestra campos: título, contenido rich text, tags
6. Juan escribe post sobre "Técnicas de mindfulness"
7. Usa toolbar de TipTap para formato enriquecido
8. Guarda como draft (status: draft)
9. María recibe notificación de nuevo draft
10. María revisa, hace clic en "Publicar"
11. Sistema actualiza blog en repositorio

---

## 18. Comparativa con TinaCMS/Decap CMS

| Aspecto                  | Sumaq Sites           | TinaCMS              | DecapCMS             |
| ------------------------ | --------------------- | -------------------- | -------------------- |
| **Framework frontend**   | Nuxt.js               | Next.js              | Next.js/Gatsby/Astro |
| **Base de datos**        | PostgreSQL (Neon)     | Git-only             | Git-only             |
| **Gestión de contenido** | Formularios dinámicos | Block-based ( Tina ) | WYSIWYG              |
| **Sincronización**       | Bidireccional         | Unidireccional       | Unidireccional       |
| **Performance**          | Alta (static + DB)    | Alta (static)        | Alta (static)        |
| **Curva de aprendizaje** | Baja                  | Media                | Baja                 |
| **Customización de UI**  | Limitada              | Alta (React)         | Media                |
| **Multi-idioma**         | Integrado             | Requiere config      | Requiere config      |
| **Target**               | No técnicos           | Técnicos             | No técnicos          |

---

## 19. Seguridad

### 19.1 Medidas Implementadas

| Medida                 | Implementación                        |
| ---------------------- | ------------------------------------- |
| **Input Validation**   | Zod schemas en todas las entradas     |
| **SQL Injection**      | Drizzle ORM con parameterized queries |
| **XSS Prevention**     | Sanitización en rich text             |
| **CSRF Protection**    | Nuxt built-in                         |
| **Webhook Security**   | Validación HMAC signature             |
| **Password Hashing**   | bcrypt (10 rondas)                    |
| **Session Encryption** | Sealed cookies                        |

### 19.2 Variables de Seguridad

- Rate limiting: Pendiente implementar (10 req/10s)
- 2FA: Pendiente
- Account lockout: Pendiente

---

## 20. Performance

### 20.1 Optimizaciones Implementadas

| Estrategia            | Descripción                            |
| --------------------- | -------------------------------------- |
| **Database Indexing** | Índices en FK, búsquedas, GIN en JSONB |
| **Lazy Loading**      | Media con Intersection Observer        |
| **Auto-save**         | Debounced 3s                           |
| **Optimistic UI**     | Updates antes de confirmación          |

### 20.2 Optimizaciones Planificadas

| Estrategia             | Descripción                  |
| ---------------------- | ---------------------------- |
| **Schema Cache**       | Redis para cache de esquemas |
| **Incremental Builds** | Solo rebuild páginas changed |

---

## 21. Próximos Pasos

### 21.1 Inmediatos (Esta semana)

1. **Completar GitHub integration** para leer/escribir archivos `cms/*.yaml`
2. **Integrar Vercel API** para monitorear deployments
3. **Implementar preview iframe** del sitio en editor

### 21.2 Corto Plazo (2-4 semanas)

4. **Publish system completo** - DB → Git → Deploy
5. **Media Manager** - Upload drag & drop, galería
6. **Analytics dashboard** - Stats básicas desde Vercel API

### 21.3 Mediano Plazo (1-2 meses)

7. **Conflict detection** - UI para resolver conflictos Git
8. **Activity logs UI** - Dashboard de actividad
9. **Onboarding flow** - Wizard guiado para nuevos usuarios

---

## 22. Resumen de Funcionalidades

> **NOTA:** Todos los estados están marcados como **⏳ Pendiente de implementar** ya que el proyecto se reiniciará con vibe coding.

| #   | Funcionalidad                        | Prioridad | Estado |
| --- | ------------------------------------ | --------- | ------ |
| 1   | Nuxt 4 + Nuxt UI base                | P0        | ⏳     |
| 2   | Drizzle schema (users, sites, pages) | P0        | ⏳     |
| 3   | Auth con roles (Admin/Owner/Editor)  | P0        | ⏳     |
| 4   | Dashboard con sitios por rol         | P0        | ⏳     |
| 5   | Form Renderer dinámico               | P0        | ⏳     |
| 6   | GitHub OAuth flow                    | P1        | ⏳     |
| 7   | i18n (ES/EN/DE)                      | P1        | ⏳     |
| 8   | Auto-save en editor                  | P0        | ⏳     |
| 9   | GitHub file read/write (cms/\*.yaml) | P1        | ⏳     |
| 10  | Vercel deployment monitoring         | P1        | ⏳     |
| 11  | Preview iframe                       | P2        | ⏳     |
| 12  | Media Manager                        | P1        | ⏳     |
| 13  | Analytics dashboard                  | P2        | ⏳     |
| 14  | Publish system (DB→Git→Deploy)       | P1        | ⏳     |
| 15  | Conflict detection                   | P2        | ⏳     |

---

## 23. Anexo: Glosario

| Término           | Definición                                                          |
| ----------------- | ------------------------------------------------------------------- |
| **SSOT**          | Single Source of Truth - fuente única de verdad                     |
| **Form Renderer** | Componente que genera formularios desde esquemas YAML               |
| **Schema (YAML)** | Archivo `cms/[type].[name].yaml` que define estructura de contenido |
| **JSONB**         | JSON almacenado como tipo binario en PostgreSQL                     |
| **TipTap**        | Editor WYSIWYG basado en ProseMirror                                |
| **PGlite**        | PostgreSQL en WebAssembly para desarrollo local                     |
| **Owner**         | Rol con acceso completo a sus propios sitios                        |
| **Editor**        | Rol con acceso de edición a sitios asignados                        |
| **Admin**         | Rol administrativo con acceso total al sistema                      |

---

## Registro de Cambios

### v1.4 (Abril 2026) - Estados MVP marcados como pendientes + Vibe Coding

**Cambios principales:**

1. **Estados del MVP:** Todos los estados ✅ y 🔄 cambiados a ⏳ (pendiente de implementar)
2. **Nueva nota de estado:** Sección al inicio del documento indicando que el proyecto se reiniciará
3. **Ejemplos reales añadidos:** Sección 4.8 ahora incluye los ejemplos reales de `page.example.yaml` y `page.example.json`
4. **Próximo paso documentado:** Nueva subsección 12.3 indicando el uso de vibe coding

**Archivos de ejemplo añadidos:**

- `page.example.yaml` → Estructura YAML completa con secciones: meta, brand, navigation, welcome, about, profile, footer
- `page.example.json` → JSON resultante con datos de ejemplo

**Motivación:**
El proyecto será recreado utilizando vibe coding, un enfoque de desarrollo asistido por IA. Este documento sirve como especificación de referencia.

---

### v1.3 (Abril 2026) - Corrección de rutas y estructura Astro

**Cambios:**

- Corrección de `public/cms` y `public/data` → ahora `/cms/` y `src/data/`
- Actualización de estructura de repositorio de cliente (Astro)
- Diferenciación clara entre Sumaq CMS (Nuxt) y Sitios de Clientes (Astro)
- Nueva tabla de Arquitectura Dual

---

### v1.2 (Abril 2026) - Actualización desde archivos de código

**Nuevas secciones añadidas:**

1. **Sección 5: Arquitectura de API Dual** - Detalle completo de Legacy API vs Modern CMS API
2. **Sección 13: Convenciones de Código** - Estilo, naming, patrones de API, testing

**Actualizaciones significativas:**

| Sección     | Cambio                                                                         |
| ----------- | ------------------------------------------------------------------------------ |
| **2.3**     | Arquitectura de archivos: `public/cms/` (active) vs `app/assets/cms/` (backup) |
| **3.1**     | Añadido rol "Partner" como 4to rol del sistema                                 |
| **4.2**     | Pipeline Schema-to-Form detallado con diagrama                                 |
| **4.3**     | Sistema de auto-descubrimiento con regex de validación                         |
| **4.4**     | Preview en tiempo real con PreviewPanel.vue                                    |
| **4.5**     | Tabla de tipos de campos con mapeo Zod                                         |
| **4.6**     | Error reporting detallado con mapeo de rutas                                   |
| **4.10**    | Guía para agregar nuevos tipos de campo                                        |
| **5.1-5.5** | Nueva sección API Dual con patrones de código                                  |
| **13**      | Nueva sección de convenciones de código                                        |
| **14**      | Estructura actualizada con componentes del editor                              |
| **16**      | Endpoints de API modernos del CMS documentados                                 |

**Fuente de información:**

- `instructions-cms.md` - Guías para agentes del CMS (Nuxt 4, autenticación, roles)
- `instructions-editor.md` - Instrucciones del editor (formularios dinámicos, TipTap, preview)

---

_Documento generado a partir del análisis de archivos del proyecto Sumaq Sites._
_Versión actualizada con decisiones finales del equipo y análisis de código._
