import vcCake from 'vc-cake'

const cook = vcCake.getService('cook')
const documentService = vcCake.getService('document')
const assetManager = vcCake.getService('assets-manager')

vcCake.add('assets', (api) => {
  api.reply('data:add', (element) => {
    addStyle(element)
  })

  api.reply('data:beforeRemove', (id) => {
    let elements = []
    let walkChildren = (id) => {
      let element = documentService.get(id)
      elements.push(element)
      let children = documentService.children(id)
      children.forEach((child) => {
        walkChildren(child.id)
      })
    }
    walkChildren(id)
    removeStyles(elements)
  })

  api.reply('data:clone', (id) => {
    let elements = []
    let walkChildren = (id) => {
      let element = documentService.get(id)
      elements.push(element)
      let children = documentService.children(id)
      children.forEach((child) => {
        walkChildren(child.id)
      })
    }
    walkChildren(id)
    addStyles(elements)
  })

  /**
   * @param element
   */
  function addStyle (element) {
    let cssSettings = cook.get(element).get('cssSettings')
    assetManager.add('styles', element.tag, cssSettings)
  }

  /**
   * @param elements
   */
  function addStyles (elements = []) {
    elements.forEach((element) => {
      addStyle(element)
    })
  }

  /**
   * @param element
   */
  function removeStyle (element) {
    assetManager.remove('styles', element.tag)
  }

  /**
   * @param elements
   */
  function removeStyles (elements = []) {
    elements.forEach((element) => {
      removeStyle(element)
    })
  }
})
