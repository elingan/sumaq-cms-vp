# Sumaq CMS — MVP Build Prompt

> Este prompt está diseñado para construir el MVP de Sumaq CMS paso a paso.
> Referencia completa: `.amauta/sumaq-sites-definition.md`

---

## Contexto del Proyecto

Sumaq CMS es un **Git-based Headless CMS** construido con **Nuxt 4 + Nuxt UI 4**. Permite a usuarios no técnicos editar contenido de sitios web estáticos (Astro) mediante formularios dinámicos generados desde esquemas YAML. El contenido se guarda en **PostgreSQL** (Neon en prod, PGlite en dev) y se sincroniza con repositorios **GitHub** para deployment automático en **Vercel**.

### Stack Tecnológico

| Componente    | Tecnología                            |
| ------------- | ------------------------------------- |
| Frontend      | Nuxt 4 + Nuxt UI 4                    |
| Base de datos | PGlite (dev) / Neon PostgreSQL (prod) |
| ORM           | Drizzle ORM (PostgreSQL dialect)      |
| Autenticación | nuxt-auth-utils (sessions)            |
| Git           | GitHub API (Octokit)                  |
| i18n          | @nuxtjs/i18n                          |
| Iconos        | @iconify-json/lucide                  |
| Tooling       | Vite+ (`vp` CLI)                      |

### Dependencias ya instaladas

```
@nuxt/ui, @nuxthub/core, @nuxtjs/i18n, nuxt-auth-utils, @nuxt/image, @nuxt/eslint, tailwindcss
```

### Estado actual

El proyecto es un starter template vacío de Nuxt UI con:

- 1 página (`index.vue` — landing genérica)
- 2 componentes (`AppLogo.vue`, `TemplateMenu.vue`)
- Sin server routes, sin base de datos, sin middleware, sin composables, sin i18n

---

## Alcance del MVP

### Funcionalidades a implementar (en orden)

| Fase | Funcionalidad              | Descripción                                                                                |
| ---- | -------------------------- | ------------------------------------------------------------------------------------------ |
| 1    | Esquema de base de datos   | Tablas: users, sites, site_users, pages, media, activity_logs, audit_logs, password_resets |
| 2    | Autenticación              | Login/logout email+password, sesiones, middleware de protección de rutas                   |
| 3    | Layout y navegación        | Sidebar, navbar, footer, layout responsivo para dashboard y editor                         |
| 4    | Dashboard principal        | Lista de sitios filtrada por rol del usuario                                               |
| 5    | Gestión de sitios          | CRUD de sitios (crear, listar, ver, archivar)                                              |
| 6    | Editor visual de contenido | Form Renderer dinámico desde esquemas YAML con validación Zod                              |
| 7    | Multiidioma                | ES/EN/DE con @nuxtjs/i18n (estrategia no_prefix)                                           |
| 8    | GitHub básico              | Leer/escribir archivos cms/_.yaml y src/data/_.json vía GitHub API                         |
| 9    | Seed de datos              | Script para crear usuario admin + sitio de ejemplo                                         |

---

## Fase 1: Esquema de Base de Datos

### Instrucciones

1. Instalar Drizzle ORM con soporte PostgreSQL y PGlite:

   ```bash
   vp add drizzle-orm @electric-sql/pglite
   vp add -D drizzle-kit
   ```

2. Crear `server/db/schema.ts` con las siguientes tablas usando Drizzle ORM PostgreSQL dialect:

#### Tabla `users`

```
id: uuid (PK, default random)
email: text (unique, not null)
password: text (not null)  — bcrypt hashed
name: text
role: enum('admin', 'partner', 'owner', 'editor')
github_data: jsonb  — { installationId, accountType }
created_at: timestamp (default now)
updated_at: timestamp (default now)
```

#### Tabla `sites`

```
id: uuid (PK, default random)
slug: text (unique)
name: text (not null)
description: text
language: text (default 'en')
domain: text
site_url: text
screenshot_url: text
github_repo_url: text
github_branch: text (default 'main')
vercel_project_id: text
vercel_url: text
template: text (default 'blank')
status: enum('active', 'archived') (default 'active')
created_at: timestamp (default now)
updated_at: timestamp (default now)
```

#### Tabla `site_users`

```
site_id: uuid (FK → sites.id)
user_id: uuid (FK → users.id)
role: enum('owner', 'editor', 'partner')
created_at: timestamp (default now)
PK: (site_id, user_id)
```

#### Tabla `pages`

```
id: uuid (PK, default random)
site_id: uuid (FK → sites.id)
type: text  — 'page' o 'blog'
name: text  — ej: 'index', 'about'
title: text
content_json: jsonb
schema_yaml: text  — cache del esquema YAML
status: enum('draft', 'published') (default 'draft')
published_at: timestamp
created_at: timestamp (default now)
updated_at: timestamp (default now)
```

#### Tabla `media`

```
id: uuid (PK, default random)
site_id: uuid (FK → sites.id)
filename: text (not null)
url: text (not null)
thumbnail_url: text
size_bytes: integer
mime_type: text
dimensions: jsonb  — { width, height }
created_at: timestamp (default now)
```

#### Tabla `activity_logs`

```
id: serial (PK)
user_id: uuid (FK → users.id)
site_id: uuid (FK → sites.id)
action: text (not null)
details: jsonb
ip_address: text
created_at: timestamp (default now)
```

#### Tabla `audit_logs`

```
id: serial (PK)
user_id: uuid (FK → users.id)
action: text (not null)
target_type: text  — 'user', 'site', 'page'
target_id: uuid
changes: jsonb
created_at: timestamp (default now)
```

#### Tabla `password_resets`

```
id: serial (PK)
user_id: uuid (FK → users.id)
token: text (unique, not null)
expires_at: timestamp (not null)
created_at: timestamp (default now)
```

3. Crear `server/db/client.ts` con lógica dual:
   - En desarrollo: usar PGlite (in-memory o persistido en `.data/pglite`)
   - En producción: conectar a Neon vía `DATABASE_URL`

4. Crear `drizzle.config.ts` para migraciones.

5. Crear índices recomendados:
   - `idx_pages_site_id` en pages(site_id)
   - `idx_pages_status` en pages(status)
   - `idx_activity_logs_site_id` en activity_logs(site_id)
   - `idx_activity_logs_user_id` en activity_logs(user_id)
   - GIN index en pages(content_json)

---

## Fase 2: Autenticación

### Instrucciones

1. Crear `server/utils/password.ts`:
   - `hashPassword(password: string): Promise<string>` — bcrypt, 10 rondas
   - `verifyPassword(password: string, hash: string): Promise<boolean>`

2. Crear `server/utils/audit.ts`:
   - `createAuditLog(userId, action, details, event)` — inserta en audit_logs

3. API routes de autenticación:
   - `server/api/auth/login.post.ts` — validar email+password con Zod, crear sesión con `setUserSession`
   - `server/api/auth/logout.post.ts` — cerrar sesión con `clearUserSession`
   - `server/api/auth/me.get.ts` — retornar usuario actual desde sesión

4. Middleware:
   - `app/middleware/auth.global.ts` — proteger rutas `/dashboard`, `/site`, `/admin`, `/settings`, `/profile`. Redirigir a `/login` si no hay sesión.
   - `app/middleware/admin.global.ts` — rutas `/admin/*` solo para rol `admin`.

5. Páginas:
   - `app/pages/login.vue` — Usar el componente `UAuthForm` de Nuxt UI (https://ui.nuxt.com/docs/components/auth-form)

   Ejemplo de implementación:

   ```vue
   <script setup lang="ts">
   import * as z from 'zod'
   import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

   const fields: AuthFormField[] = [
     {
       name: 'email',
       type: 'email',
       label: 'Email',
       placeholder: 'Enter your email',
       required: true,
     },
     {
       name: 'password',
       label: 'Password',
       type: 'password',
       placeholder: 'Enter your password',
       required: true,
     },
   ]

   const schema = z.object({
     email: z.email('Invalid email'),
     password: z.string('Password is required').min(8, 'Must be at least 8 characters'),
   })

   type Schema = z.output<typeof schema>

   async function onSubmit(payload: FormSubmitEvent<Schema>) {
     // POST /api/auth/login → setUserSession → redirect to /dashboard
   }
   </script>

   <template>
     <div class="flex flex-col items-center justify-center gap-4 p-4">
       <UPageCard class="w-full max-w-md">
         <UAuthForm
           :schema="schema"
           :fields="fields"
           title="Welcome back!"
           description="Enter your credentials to access your account."
           icon="i-lucide-lock"
           @submit="onSubmit"
         >
           <template #password-hint>
             <ULink to="#" class="text-primary font-medium" tabindex="-1">Forgot password?</ULink>
           </template>
           <template #validation>
             <UAlert color="error" icon="i-lucide-info" title="Error signing in" />
           </template>
           <template #footer>
             By signing in, you agree to our
             <ULink to="#" class="text-primary font-medium">Terms of Service</ULink>.
           </template>
         </UAuthForm>
       </UPageCard>
     </div>
   </template>
   ```

   **Props clave de `UAuthForm`:**
   - `fields` — Array de `AuthFormField` con `name`, `type` (`email`, `password`, `text`, `checkbox`, `select`, `otp`), `label`, `placeholder`, `required`
   - `schema` — Esquema Zod para validación
   - `title`, `description`, `icon` — Header del formulario
   - `providers` — Array de `ButtonProps` para login social (futuro)
   - `submit` — Props del botón de submit (`{ label: 'Continue', block: true }`)
   - **Slots:** `#header`, `#description`, `#password-hint`, `#validation`, `#footer`
   - Envolver en `UPageCard` para un diseño centrado y limpio

6. Variable de entorno requerida: `NUXT_SESSION_PASSWORD` (32+ chars)

### Sesión de usuario

```typescript
// Estructura del user en sesión
interface SessionUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'partner' | 'owner' | 'editor'
}
```

---

## Fase 3: Layout y Navegación

### Componentes Nuxt UI Dashboard

Usar los componentes Dashboard de Nuxt UI 4 como base del layout. Documentación: https://ui.nuxt.com/docs/components

| Componente                  | Propósito                                                                       |
| --------------------------- | ------------------------------------------------------------------------------- |
| `UDashboardGroup`           | Contenedor raíz que gestiona estado de sidebar (resize, collapse, persistencia) |
| `UDashboardSidebar`         | Sidebar resizable y colapsable con soporte mobile (slideover/drawer)            |
| `UDashboardPanel`           | Panel principal de contenido                                                    |
| `UDashboardNavbar`          | Navbar responsiva con toggle de sidebar en mobile                               |
| `UDashboardSidebarCollapse` | Botón para colapsar sidebar en desktop                                          |
| `UDashboardSearchButton`    | Botón pre-estilizado para abrir búsqueda                                        |
| `UNavigationMenu`           | Menú de navegación vertical para la sidebar                                     |

### Instrucciones

1. Crear dos layouts Nuxt:
   - **Layout público** (`app/layouts/default.vue`): navbar simple + footer (para login, landing)
   - **Layout dashboard** (`app/layouts/dashboard.vue`): estructura completa con sidebar + panel

2. **Layout dashboard** — Estructura base con componentes Nuxt UI:

   ```vue
   <!-- app/layouts/dashboard.vue -->
   <script setup lang="ts">
   import type { NavigationMenuItem } from '@nuxt/ui'

   const { user } = useUserSession()

   const items: NavigationMenuItem[][] = [
     [
       { label: 'Dashboard', icon: 'i-lucide-house', to: '/dashboard' },
       { label: 'Sites', icon: 'i-lucide-globe', to: '/dashboard/sites' },
       { label: 'Settings', icon: 'i-lucide-settings', to: '/settings' },
     ],
   ]

   // Items de admin (condicional por rol)
   if (user.value?.role === 'admin') {
     items[0].push({
       label: 'Admin',
       icon: 'i-lucide-shield',
       defaultOpen: true,
       children: [{ label: 'Users', to: '/admin/users' }],
     })
   }
   </script>

   <template>
     <UDashboardGroup>
       <UDashboardSidebar collapsible resizable>
         <template #header="{ collapsed }">
           <AppLogo v-if="!collapsed" class="h-5 w-auto" />
           <UIcon v-else name="i-lucide-layout-dashboard" class="size-5 text-primary mx-auto" />
         </template>

         <template #default="{ collapsed }">
           <UNavigationMenu :collapsed="collapsed" :items="items[0]" orientation="vertical" />
         </template>

         <template #footer="{ collapsed }">
           <UButton
             :avatar="{ src: '' }"
             :label="collapsed ? undefined : user?.name"
             color="neutral"
             variant="ghost"
             class="w-full"
             :block="collapsed"
           />
         </template>
       </UDashboardSidebar>

       <UDashboardPanel>
         <template #header>
           <UDashboardNavbar :title="$route.meta.title as string">
             <template #leading>
               <UDashboardSidebarCollapse />
             </template>
             <template #right>
               <!-- Selector de idioma, notificaciones, user menu -->
             </template>
           </UDashboardNavbar>
         </template>

         <slot />
       </UDashboardPanel>
     </UDashboardGroup>
   </template>
   ```

3. **Props clave de `UDashboardSidebar`:**
   - `resizable` — Permite arrastrar para redimensionar
   - `collapsible` — Permite colapsar arrastrando al borde
   - `side` — `'left'` (default) o `'right'`
   - `mode` — `'slideover'` (default), `'drawer'`, `'modal'` para menú mobile
   - `min-size`, `max-size`, `default-size`, `collapsed-size` — Tamaños en porcentaje
   - **Slots:** `#header`, `#default`, `#footer` — Todos reciben `{ collapsed, collapse }`
   - Estado persistido automáticamente vía `UDashboardGroup` props `storage` y `storage-key`

4. **Props clave de `UDashboardNavbar`:**
   - `title`, `icon` — Título e icono de la página
   - `toggle` — Botón para abrir sidebar en mobile (default: true)
   - `toggle-side` — `'left'` (default) o `'right'`
   - **Slots:** `#leading`, `#trailing`, `#left`, `#default`, `#right`, `#toggle`

5. La sidebar debe mostrar opciones según el rol usando `UNavigationMenu`:
   - **Admin**: Dashboard, Sites, Admin (Users con children), Settings
   - **Owner/Editor**: Dashboard, site selector, Pages (submenu dinámico), Settings
   - Usar `NavigationMenuItem[][]` (array de arrays) para separar grupos de navegación

6. Cada página del dashboard debe usar `definePageMeta({ layout: 'dashboard' })`.

---

## Fase 4: Dashboard Principal

### Instrucciones

1. Crear `app/pages/dashboard.vue`:
   - Grid de cards mostrando sitios del usuario
   - Filtrado por rol: Admin ve todos, Owner solo los suyos, Editor solo asignados
   - Cada card muestra: nombre, URL, estado (badge), última actualización
   - Botón "Nuevo sitio" (solo Admin/Owner)
   - Estado vacío: "Crea tu primer sitio"

2. API route `server/api/sites/index.get.ts`:
   - Requiere sesión
   - Admin: retorna todos los sitios
   - Owner/Editor: retorna sitios vinculados en site_users

3. Composable `app/composables/useRole.ts`:
   ```typescript
   const { user } = useUserSession()
   const role = computed(() => user.value?.role)
   const isAdmin = computed(() => role.value === 'admin')
   const isOwner = computed(() => role.value === 'owner')
   const isEditor = computed(() => role.value === 'editor')
   ```

---

## Fase 5: Gestión de Sitios

### Instrucciones

1. API routes CRUD:
   - `server/api/sites/index.get.ts` — listar (ya creado en fase 4)
   - `server/api/sites/index.post.ts` — crear sitio (Admin/Owner)
   - `server/api/sites/[id].get.ts` — ver detalle
   - `server/api/sites/[id].patch.ts` — actualizar (Owner+)
   - `server/api/sites/[id].delete.ts` — archivar (soft delete, Owner+)

2. Páginas:
   - `app/pages/site/[id]/index.vue` — detalle del sitio con sidebar y lista de páginas
   - `app/pages/site/[id]/settings.vue` — configuración del sitio

3. Componente:
   - `app/components/sites/SiteCard.vue` — card para el grid del dashboard
   - `app/components/sites/SiteForm.vue` — modal/formulario para crear/editar sitio

4. Admin CRUD de usuarios:
   - `server/api/admin/users/index.get.ts`
   - `server/api/admin/users/index.post.ts`
   - `server/api/admin/users/[id].patch.ts`
   - `server/api/admin/users/[id].delete.ts`
   - `app/pages/admin/users/index.vue`

---

## Fase 6: Editor Visual de Contenido

### Instrucciones

Esta es la funcionalidad core del CMS.

1. **Esquema YAML de ejemplo** — Incluir en `app/assets/cms/page.index.yaml` (para desarrollo sin GitHub):

```yaml
meta:
  name: metadata
  label: Metadata
  description: Page metadata configuration
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
  description: Brand information
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
  description: Navigation menu configuration
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
  label: Welcome Section
  description: Hero/welcome section
  fields:
    - id: title
      label: Title
      type: string
    - id: description
      label: Description
      type: text
about:
  id: about
  label: About Section
  description: About section with rich content
  fields:
    - id: title
      label: Title
      type: string
    - id: description
      label: Description
      type: string
    - id: content
      label: Rich Content
      type: text
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
footer:
  id: footer
  label: Footer
  description: Footer configuration
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

2. **Composables**:
   - `app/composables/usePageSchema.ts`:
     - Cargar esquema YAML (desde assets en dev, desde GitHub API en prod)
     - Parsear YAML a objeto JavaScript
     - Retornar secciones y campos tipados

   - `app/composables/useSchemaValidator.ts`:
     - Generar esquema Zod dinámicamente desde la definición YAML
     - Mapeo de tipos: `string→z.string()`, `number→z.number()`, `url→z.string().refine(isUrlOrRelativeAnchor)`, `image→z.string().url()`, `list→z.array(z.object())`, `boolean→z.boolean()`, `date→z.string()`, `text→z.string()`, `select→z.enum(options)`, `object→z.object()`
     - Validar formState contra el esquema generado
     - Retornar errores con rutas legibles ("About → Features → Ítem 1 → Title")

3. **Componentes del Editor**:
   - `app/components/editor/DynamicForm.vue`:
     - Recibe esquema parseado y formState
     - Renderiza una UCard por cada sección del esquema
     - Header de cada card: icono + label + description
     - Itera campos y delega a DynamicField
     - Botón "Guardar" que valida y emite evento

   - `app/components/editor/DynamicField.vue`:
     - Router de campos: según `field.type` renderiza el componente correcto
     - Pasa `modelValue`, `field`, `error` a cada Field\*

   - `app/components/editor/FieldString.vue` — `<UInput>`
   - `app/components/editor/FieldText.vue` — `<UTextarea>` (texto largo sin formato)
   - `app/components/editor/FieldNumber.vue` — `<UInput type="number">`
   - `app/components/editor/FieldSelect.vue` — `<USelect>` con opciones del schema
   - `app/components/editor/FieldUrl.vue` — `<UInput>` con validación URL flexible
   - `app/components/editor/FieldImage.vue` — `<UInput>` + thumbnail preview
   - `app/components/editor/FieldList.vue` — Array dinámico con add/remove/reorder, campos anidados via DynamicField recursivo
   - `app/components/editor/FieldBoolean.vue` — `<UCheckbox>` o `<USwitch>`
   - `app/components/editor/FieldDate.vue` — Input de fecha
   - `app/components/editor/FieldObject.vue` — Grupo de campos anidados renderizados via DynamicField recursivo

4. **API routes del editor**:
   - `server/api/pages/[siteId].get.ts` — listar páginas del sitio
   - `server/api/pages/[siteId].post.ts` — crear página
   - `server/api/pages/[siteId]/[pageId].get.ts` — obtener página con content_json
   - `server/api/pages/[siteId]/[pageId].put.ts` — actualizar content_json en DB

5. **Página del editor**:
   - `app/pages/site/[id]/pages/[pageId]/edit.vue`
   - Carga esquema YAML + datos JSON de la página
   - Renderiza DynamicForm
   - Auto-save debounced (3s) guarda en DB como draft
   - Botón "Guardar" guarda inmediatamente
   - Botón "Publicar" cambia status a published (en MVP solo actualiza status en DB)

### Tipos de campo soportados en MVP

| Tipo      | Componente   | Mapeo Zod                  |
| --------- | ------------ | -------------------------- |
| `string`  | FieldString  | `z.string()`               |
| `text`    | FieldText    | `z.string()`               |
| `number`  | FieldNumber  | `z.number()`               |
| `select`  | FieldSelect  | `z.enum(options)`          |
| `url`     | FieldUrl     | `z.string().refine(isUrl)` |
| `image`   | FieldImage   | `z.string().url()`         |
| `list`    | FieldList    | `z.array(z.object(...))`   |
| `boolean` | FieldBoolean | `z.boolean()`              |
| `date`    | FieldDate    | `z.string()`               |
| `object`  | FieldObject  | `z.object(...)`            |

---

## Fase 7: Multiidioma (i18n)

### Instrucciones

1. Configurar `@nuxtjs/i18n` en `nuxt.config.ts`:
   - Estrategia: `no_prefix`
   - Detección: navegador + cookie
   - Locales: `es`, `en`, `de`
   - Locale por defecto: `en`

2. Crear archivos de traducción:
   - `app/i18n/en.json`
   - `app/i18n/es.json`
   - `app/i18n/de.json`

3. Claves mínimas a traducir:
   - Navegación: dashboard, sites, pages, settings, admin, users, login, logout
   - Acciones: save, publish, create, edit, delete, archive, cancel, confirm
   - Estados: draft, published, building, ready, error, active, archived
   - Editor: section labels, save draft, publish, validation errors
   - Auth: email, password, login, forgot password, etc.

4. Selector de idioma en el navbar (dropdown con bandera/código).

---

## Fase 8: Integración GitHub Básica

### Instrucciones

1. Instalar Octokit:

   ```bash
   vp add octokit
   ```

2. Crear `server/utils/github.ts`:
   - Inicializar cliente Octokit con token de GitHub App
   - Funciones helper:
     - `getRepoContents(owner, repo, path, branch)` — leer archivo/directorio
     - `updateRepoFile(owner, repo, path, content, message, branch, sha)` — crear/actualizar archivo
     - `listCmsSchemas(owner, repo, branch)` — listar archivos `cms/*.yaml`

3. API routes:
   - `server/api/github/files/[siteId].get.ts` — leer archivos cms/\*.yaml del repo asociado al sitio
   - `server/api/github/files/[siteId].put.ts` — escribir archivos al repo (para publicación)

4. Variables de entorno requeridas:

   ```
   GITHUB_APP_ID
   GITHUB_PRIVATE_KEY
   GITHUB_CLIENT_ID
   GITHUB_CLIENT_SECRET
   ```

5. El flujo es:
   - GET `/api/github/files/:siteId` → lee `cms/*.yaml` del repo → parsea y retorna lista de content types
   - PUT `/api/github/files/:siteId` → recibe content_json → genera JSON → hace commit+push a `src/data/{name}.json`

---

## Fase 9: Seed de Datos

### Instrucciones

1. Crear `server/db/seed.ts`:

   ```typescript
   // Crea usuario admin por defecto:
   // email: admin@sumaq.io
   // password: Admin123! (hashed con bcrypt)
   // role: admin
   // name: Admin

   // Crea sitio de ejemplo:
   // name: Mi Sitio Demo
   // slug: demo
   // template: therapy
   // status: active

   // Asocia admin como owner del sitio demo

   // Crea página de ejemplo:
   // type: page
   // name: index
   // title: Homepage
   // content_json: (ejemplo basado en page.index.yaml)
   // status: draft
   ```

2. Agregar script en `package.json`: `"seed": "tsx server/db/seed.ts"`

---

## Convenciones de Código

### API Routes

- Archivo por método HTTP: `index.get.ts`, `index.post.ts`, `[id].patch.ts`
- Siempre validar input con Zod
- Siempre `requireUserSession(event)` para rutas protegidas
- Siempre verificar roles antes de operar
- Error codes: 400 (input inválido), 401 (no autenticado), 403 (no autorizado), 404 (no encontrado), 409 (conflicto)
- Siempre crear audit log para operaciones de escritura

### Componentes Vue

- `<script setup lang="ts">` siempre
- Props con `defineProps<Props>()` y `withDefaults`
- Emits con `defineEmits<{...}>()`
- Usar componentes Nuxt UI (`UButton`, `UInput`, `UCard`, `UTable`, `UModal`, etc.)
- Auto-import de componentes y composables

### Estilos

- Comillas simples en JS/TS
- Sin punto y coma
- Trailing commas: `always-multiline`
- Kebab-case para archivos/carpetas
- PascalCase para componentes Vue

### Vite+

- Usar `vp add` para instalar dependencias (NO usar pnpm/npm directamente)
- Usar `vp dev` para servidor de desarrollo
- Usar `vp check` y `vp test` para validar cambios
- Importar desde `vite-plus` y `vite-plus/test` para configuración y testing

---

## Variables de Entorno

Crear `.env` con:

```bash
# Sesión (obligatorio)
NUXT_SESSION_PASSWORD=your-32-char-minimum-secret-key-here

# Base de datos (solo producción, en dev usa PGlite)
# DATABASE_URL=postgresql://user:password@host.neon.tech/db?sslmode=require

# GitHub App (para integración Git, fase 8)
# GITHUB_APP_ID=
# GITHUB_PRIVATE_KEY=
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=
```

---

## Estructura Final de Archivos

```
sumaq-cms-vp/
├── app/
│   ├── app.vue
│   ├── app.config.ts
│   ├── assets/
│   │   ├── css/main.css
│   │   └── cms/
│   │       └── page.index.yaml          # Esquema de ejemplo para dev
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppNavbar.vue
│   │   │   ├── AppSidebar.vue
│   │   │   └── AppFooter.vue
│   │   ├── sites/
│   │   │   ├── SiteCard.vue
│   │   │   └── SiteForm.vue
│   │   └── editor/
│   │       ├── DynamicForm.vue
│   │       ├── DynamicField.vue
│   │       ├── FieldString.vue
│   │       ├── FieldText.vue
│   │       ├── FieldNumber.vue
│   │       ├── FieldSelect.vue
│   │       ├── FieldUrl.vue
│   │       ├── FieldImage.vue
│   │       ├── FieldList.vue
│   │       ├── FieldBoolean.vue
│   │       ├── FieldDate.vue
│   │       └── FieldObject.vue
│   ├── composables/
│   │   ├── useRole.ts
│   │   ├── usePageSchema.ts
│   │   └── useSchemaValidator.ts
│   ├── middleware/
│   │   ├── auth.global.ts
│   │   └── admin.global.ts
│   ├── pages/
│   │   ├── index.vue                    # Landing page pública
│   │   ├── login.vue
│   │   ├── dashboard.vue
│   │   ├── site/
│   │   │   └── [id]/
│   │   │       ├── index.vue            # Detalle del sitio
│   │   │       ├── settings.vue
│   │   │       └── pages/
│   │   │           └── [pageId]/
│   │   │               └── edit.vue     # Editor de página
│   │   └── admin/
│   │       └── users/
│   │           └── index.vue            # Gestión de usuarios
│   └── i18n/
│       ├── en.json
│       ├── es.json
│       └── de.json
├── server/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login.post.ts
│   │   │   ├── logout.post.ts
│   │   │   └── me.get.ts
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
│   │   │   └── [siteId]/
│   │   │       ├── [pageId].get.ts
│   │   │       └── [pageId].put.ts
│   │   └── github/
│   │       └── files/
│   │           ├── [siteId].get.ts
│   │           └── [siteId].put.ts
│   ├── db/
│   │   ├── schema.ts
│   │   ├── client.ts
│   │   ├── seed.ts
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
├── drizzle.config.ts
├── nuxt.config.ts
├── package.json
└── .env
```

---

## Criterios de Aceptación del MVP

- [ ] Login/logout funcional con sesiones
- [ ] Middleware protege rutas correctamente según rol
- [ ] Dashboard muestra sitios filtrados por rol del usuario
- [ ] CRUD de sitios funcional (crear, ver, editar, archivar)
- [ ] Admin puede crear/editar/eliminar usuarios
- [ ] Editor carga esquema YAML y renderiza formulario dinámico
- [ ] Todos los tipos de campo (string, text, number, select, url, image, list, boolean, date, object) funcionan
- [ ] Validación Zod dinámica con mensajes de error legibles
- [ ] Auto-save debounced guarda content_json en DB
- [ ] i18n funciona en ES/EN/DE con selector en navbar
- [ ] Lectura de archivos cms/\*.yaml desde GitHub API
- [ ] Escritura de archivos src/data/\*.json a GitHub API
- [ ] Seed crea usuario admin y sitio de ejemplo
- [ ] `vp check` pasa sin errores
- [ ] `vp test` pasa (tests básicos)
