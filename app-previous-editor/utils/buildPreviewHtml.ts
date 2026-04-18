type PageLink = {
  label?: string
  link?: string
}

type Feature = {
  icon?: string
  title?: string
  description?: string
}

type Media = {
  name?: string
  type?: string
  features?: Feature[]
}

type SectionWelcome = {
  title?: string
  description?: string
}

type SectionAbout = {
  title?: string
  description?: string
  media?: Media
}

type Navigation = {
  items?: PageLink[]
}

type Footer = {
  copy?: string
  legal?: PageLink[]
}

type PageMeta = {
  title?: string
  description?: string
}

type PageData = {
  meta?: PageMeta
  brand?: { logo?: string; name?: string; link?: string }
  navigation?: Navigation
  sections?: { welcome?: SectionWelcome; about?: SectionAbout }
  footer?: Footer
}

const toText = (value?: string) => value ?? ''

const renderNavigation = (items: PageLink[]) =>
  items
    .map(
      (item) =>
        `<a href="${item.link ?? '#'}" class="text-gray-700 hover:text-gray-900">${toText(item.label)}</a>`,
    )
    .join('')

const renderWelcome = (section?: SectionWelcome) => {
  if (!section) return ''

  return `
  <section class="bg-linear-to-r from-blue-500 to-purple-600 text-white py-20">
    <div class="container mx-auto px-4 text-center">
      <h1 class="text-5xl font-bold mb-4">${toText(section.title)}</h1>
      <p class="text-xl">${toText(section.description)}</p>
    </div>
  </section>`
}

const renderAboutMedia = (media?: Media) => {
  if (!media) return ''

  const features = (media.features ?? [])
    .map(
      (feature) => `
              <div class="flex items-start gap-3 mt-4">
                <span class="text-2xl">${toText(feature.icon) || '📌'}</span>
                <div>
                  <h4 class="font-semibold">${toText(feature.title)}</h4>
                  <p class="text-gray-600">${toText(feature.description)}</p>
                </div>
              </div>
            `,
    )
    .join('')

  return `
        <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 class="text-xl font-semibold mb-2">${toText(media.name)}</h3>
            <p class="text-gray-600">${toText(media.type)}</p>
            ${features}
          </div>
        </div>`
}

const renderAbout = (section?: SectionAbout) => {
  if (!section) return ''

  const aboutMedia = renderAboutMedia(section.media)

  return `
  <section class="py-16">
    <div class="container mx-auto px-4">
      <h2 class="text-3xl font-bold mb-6">${toText(section.title)}</h2>
      <div class="prose max-w-none">${toText(section.description)}</div>
      ${aboutMedia}
    </div>
  </section>`
}

const renderFooterLinks = (links: PageLink[]) =>
  links
    .map(
      (link) =>
        `<a href="${link.link ?? '#'}" class="text-gray-400 hover:text-white">${toText(link.label)}</a>`,
    )
    .join('')

const renderFooter = (footer?: Footer) => {
  const footerLinks = renderFooterLinks(footer?.legal ?? [])

  return `
  <footer class="bg-gray-900 text-white py-8 mt-auto">
    <div class="container mx-auto px-4 text-center">
      <p>${toText(footer?.copy)}</p>
      ${
        footerLinks
          ? `
        <div class="flex justify-center gap-4 mt-4">
          ${footerLinks}
        </div>
      `
          : ''
      }
    </div>
  </footer>`
}

export const buildPreviewHtml = (data: PageData) => {
  const meta = data.meta ?? {}
  const brand = data.brand ?? {}
  const nav = renderNavigation(data.navigation?.items ?? [])
  const welcome = renderWelcome(data.sections?.welcome)
  const about = renderAbout(data.sections?.about)
  const footer = renderFooter(data.footer)

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${toText(meta.title) || 'Preview'}</title>
  <meta name="description" content="${toText(meta.description)}">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="min-h-screen bg-gray-50">
  <header class="bg-white shadow">
    <nav class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          ${brand.logo ? `<img src="${brand.logo}" alt="${toText(brand.name)}" class="h-10 w-auto">` : ''}
          <a href="${brand.link ?? '#'}" class="text-xl font-bold text-gray-900">${toText(brand.name) || 'Brand'}</a>
        </div>
        <div class="flex gap-4">
          ${nav}
        </div>
      </div>
    </nav>
  </header>

  ${welcome}
  ${about}
  ${footer}
</body>
</html>
  `.trim()
}
