(() => {
  if (!document.querySelector('.dynamics-gallery')) return

  const dialog = document.createElement('dialog')
  dialog.className = 'dynamics-lightbox'
  dialog.setAttribute('aria-label', '图片预览')
  dialog.innerHTML = '<button class="dynamics-lightbox__close" type="button" data-action="close" aria-label="关闭">×</button>' +
    '<div class="dynamics-lightbox__body">' +
    '<button class="dynamics-lightbox__nav" type="button" data-action="previous" aria-label="上一张">‹</button>' +
    '<figure class="dynamics-lightbox__figure"><img alt=""><figcaption></figcaption><div class="dynamics-lightbox__counter"></div></figure>' +
    '<button class="dynamics-lightbox__nav" type="button" data-action="next" aria-label="下一张">›</button>' +
    '</div>'
  document.body.appendChild(dialog)

  const imageElement = dialog.querySelector('img')
  const captionElement = dialog.querySelector('figcaption')
  const counterElement = dialog.querySelector('.dynamics-lightbox__counter')
  const previousButton = dialog.querySelector('[data-action="previous"]')
  const nextButton = dialog.querySelector('[data-action="next"]')
  let images = []
  let currentIndex = 0

  const render = () => {
    const image = images[currentIndex]
    if (!image) return
    imageElement.src = image.src
    imageElement.alt = image.alt || ''
    captionElement.textContent = image.caption || image.alt || ''
    counterElement.textContent = (currentIndex + 1) + ' / ' + images.length
    previousButton.hidden = images.length < 2
    nextButton.hidden = images.length < 2
  }

  const move = (offset) => {
    currentIndex = (currentIndex + offset + images.length) % images.length
    render()
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null
    const link = target && target.closest('.dynamics-gallery__link')
    if (!link || typeof dialog.showModal !== 'function') return

    const gallery = link.closest('.dynamics-gallery')
    try {
      images = JSON.parse(gallery.dataset.images || '[]')
    } catch {
      return
    }

    if (!images.length) return
    event.preventDefault()
    currentIndex = Number(link.dataset.index) || 0
    render()
    dialog.showModal()
  })

  dialog.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null
    if (target === dialog) {
      dialog.close()
      return
    }

    const action = target && target.closest('[data-action]')?.dataset.action
    if (action === 'close') dialog.close()
    if (action === 'previous') move(-1)
    if (action === 'next') move(1)
  })

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') move(-1)
    if (event.key === 'ArrowRight') move(1)
  })
})()