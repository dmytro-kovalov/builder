import { addStorage, getStorage, getService, env } from 'vc-cake'
import { rebuildRawLayout, addRowColumnBackground } from './lib/tools'

addStorage('elements', (storage) => {
  const documentManager = getService('document')
  // const timeMachineStorage = getStorage('timeMachine')
  const cook = getService('cook')
  const historyStorage = getStorage('history')
  const utils = getService('utils')
  const wordpressDataStorage = getStorage('wordpressData')
  const workspaceStorage = getStorage('workspace')
  const updateTimeMachine = () => {
    wordpressDataStorage.state('status').set({ status: 'changed' })
    historyStorage.trigger('add', documentManager.all())
  }
  let substituteIds = {}
  const defaultWrapper = 'column'

  const recursiveElementsRebuild = (cookElement) => {
    if (!cookElement) {
      return cookElement
    }
    let cookGetAll = cookElement.getAll()

    let elementAttributes = Object.keys(cookGetAll)
    elementAttributes.forEach((attrKey) => {
      let attributeSettings = cookElement.settings(attrKey)
      if (attributeSettings.settings.type === 'element') {
        let value = cookElement.get(attrKey)
        let innerElement = cook.get(value)
        let innerElementValue = recursiveElementsRebuild(innerElement)
        cookElement.set(attrKey, innerElementValue)
      } else if (attributeSettings.settings.type === 'rowLayout') {
        // Update OLD rowLayout to devices-object
        let value = cookElement.get(attrKey)
        if (!value || Array.isArray(value)) {
          value = {all: value}
          cookElement.set(attrKey, value)
        }
      }
    })
    // TODO: Create BC migrator for attributes/elements
    if (cookGetAll.tag === 'column') {
      // Update OLD column sizes to devices-object
      let sizeValue = cookElement.get('size')
      if (typeof sizeValue !== 'object') {
        sizeValue = {all: sizeValue, defaultSize: sizeValue}
        cookElement.set('size', sizeValue)
      }
      let lastInRowValue = cookElement.get('lastInRow')
      if (typeof lastInRowValue !== 'object') {
        lastInRowValue = {all: lastInRowValue}
        cookElement.set('lastInRow', lastInRowValue)
      }
      let firstInRowValue = cookElement.get('firstInRow')
      if (typeof firstInRowValue !== 'object') {
        firstInRowValue = {all: firstInRowValue}
        cookElement.set('firstInRow', firstInRowValue)
      }
    }

    return cookElement.toJS(true, false)
  }
  const sanitizeData = (data) => {
    let newData = Object.assign({}, data || {})
    const allKeys = Object.keys(data)
    allKeys.forEach((key) => {
      if (!newData.hasOwnProperty(key)) {
        return
      }
      let cookElement = cook.get(newData[ key ])
      if (!cookElement) {
        delete newData[ key ]
        env('debug') === true && console.warn(`Element with key ${key} removed, failed to get CookElement`)
      } else {
        let parent = cookElement.get('parent')
        if (parent) {
          if (!data.hasOwnProperty(parent)) {
            delete newData[ key ]
            env('debug') === true && console.warn(`Element with key ${key} removed, failed to get parent element`)
            newData = sanitizeData(newData)
          } else {
            newData[ key ] = recursiveElementsRebuild(cookElement)
          }
        } else {
          newData[ key ] = recursiveElementsRebuild(cookElement)
        }
      }
    })
    return newData
  }

  storage.on('add', (elementData, wrap = true, options = {}) => {
    let createdElements = []
    let cookElement = cook.get(elementData)
    if (!cookElement) {
      return
    }
    elementData = recursiveElementsRebuild(cookElement)

    if (wrap && !cookElement.get('parent')) {
      const parentWrapper = cookElement.get('parentWrapper')
      // console.log(cookElement.toJS(), parentWrapper)
      if (parentWrapper === undefined) {
        const wrapperData = cook.get({ tag: defaultWrapper })
        elementData.parent = wrapperData.toJS().id
        if (wrapperData) {
          storage.trigger('add', wrapperData.toJS(), true, { skipInitialExtraElements: true, silent: true })
        }
      } else if (parentWrapper) {
        const wrapperData = cook.get({ tag: parentWrapper })
        elementData.parent = wrapperData.toJS().id
        if (wrapperData) {
          storage.trigger('add', wrapperData.toJS(), true, { skipInitialExtraElements: true, silent: true })
        }
      }
    }

    let data = documentManager.create(elementData, {
      insertAfter: options && options.insertAfter ? options.insertAfter : false
    })
    createdElements.push(data.id)

    const initChildren = cookElement.get('initChildren')

    if (wrap && initChildren && initChildren.length && !options.skipInitialExtraElements) {
      initChildren.forEach((initChild) => {
        initChild.parent = data.id
        const childData = cook.get(initChild)
        if (childData) {
          storage.trigger('add', childData.toJS(), false, { silent: true })
        }
      })
    }

    if (data.tag === 'column') {
      let rowElement = documentManager.get(data.parent)
      rebuildRawLayout(rowElement.id, { action: options.action === 'merge' ? 'mergeColumn' : 'columnAdd', columnSize: data.size, disableStacking: rowElement.layout.disableStacking }, documentManager)
      storage.trigger('update', rowElement.id, rowElement, '', options)
    }
    if (data.tag === 'row') {
      if (data.layout && data.layout.layoutData && (data.layout.layoutData.hasOwnProperty('all') || data.layout.layoutData.hasOwnProperty('xs'))) {
        rebuildRawLayout(data.id, { layout: data.layout.layoutData }, documentManager)
        data.layout.layoutData = undefined
      } else {
        rebuildRawLayout(data.id, {}, documentManager)
      }
    }
    if (!options.silent) {
      storage.state('elementAdd').set(data)
      if (!wrap && data.parent) {
        storage.trigger(`element:${data.parent}`, documentManager.get(data.parent), 'storage', options)
      } else {
        storage.state('document').set(documentManager.children(false))
      }
      updateTimeMachine()
    }
  })
  storage.on('update', (id, element, source = '', options = {}) => {
    if (element.tag === 'row' && element.layout && element.layout.layoutData && (element.layout.layoutData.hasOwnProperty('all') || element.layout.layoutData.hasOwnProperty('xs'))) {
      rebuildRawLayout(id, { layout: element.layout.layoutData, disableStacking: element.layout.disableStacking }, documentManager)
      element.layout.layoutData = undefined
    }
    documentManager.update(id, element)
    storage.trigger(`element:${id}`, element, source, options)
    if (options && options.action === 'hide' && element.parent) {
      storage.trigger(`element:${element.parent}`, documentManager.get(element.parent), source, options)
    }
    if (element.tag === 'column') {
      addRowColumnBackground(id, element, documentManager)
      let rowElement = documentManager.get(element.parent)
      storage.trigger('update', rowElement.id, rowElement)
    }
    if (element.tag === 'tab') {
      let tabParent = documentManager.get(element.parent)
      storage.trigger('update', tabParent.id, tabParent)
    }
    if (!options.silent) {
      updateTimeMachine(source || 'elements')
    }
  })
  storage.on('remove', (id) => {
    let element = documentManager.get(id)
    if (!element) {
      return
    }
    let parent = element && element.parent ? documentManager.get(element.parent) : false
    documentManager.delete(id)

    // remove parent if it must have children by default (initChildren)
    if (parent && parent.initChildren && parent.initChildren.length && !documentManager.children(parent.id).length) {
      documentManager.delete(parent.id)
      // close editForm if deleted element is opened in edit form
      const settings = workspaceStorage.state('settings').get()
      if (settings && settings.action === 'edit' && settings.element && (parent.id === settings.element.id)) {
        workspaceStorage.state('settings').set({})
      }
      parent = parent.parent ? documentManager.get(parent.parent) : false
    } else if (element.tag === 'column') {
      let rowElement = documentManager.get(parent.id)
      rebuildRawLayout(rowElement.id, { action: 'columnRemove', size: element.size, disableStacking: rowElement.layout.disableStacking }, documentManager)
      addRowColumnBackground(id, element, documentManager)
      storage.trigger('update', rowElement.id, documentManager.get(parent.id))
    }
    storage.state(`element:${id}`).delete()
    if (parent && element.tag !== 'column') {
      storage.trigger(`element:${parent.id}`, parent)
    } else {
      storage.state('document').set(documentManager.children(false))
    }
    updateTimeMachine()
  })
  storage.on('clone', (id) => {
    let dolly = documentManager.clone(id)
    if (dolly.tag === 'column') {
      let rowElement = documentManager.get(dolly.parent)
      rebuildRawLayout(rowElement.id, { action: 'columnClone', disableStacking: rowElement.layout.disableStacking }, documentManager)
      storage.trigger('update', rowElement.id, rowElement)
    }
    if (dolly.parent) {
      storage.trigger(`element:${dolly.parent}`, documentManager.get(dolly.parent))
    } else {
      storage.state('document').set(documentManager.children(false))
    }
    updateTimeMachine()
  }, {
    debounce: 250
  })
  storage.on('move', (id, data) => {
    let element = documentManager.get(id)
    const oldParent = element.parent
    if (data.action === 'after') {
      documentManager.moveAfter(id, data.related)
    } else if (data.action === 'append') {
      documentManager.appendTo(id, data.related)
    } else {
      documentManager.moveBefore(id, data.related)
    }
    if (element.tag === 'column') {
      // rebuild previous column
      let rowElement = documentManager.get(element.parent)
      rebuildRawLayout(element.parent, { disableStacking: rowElement.layout.disableStacking }, documentManager)
      addRowColumnBackground(element.id, element, documentManager)
      // rebuild next column
      let newElement = documentManager.get(id)
      let newRowElement = documentManager.get(newElement.parent)
      addRowColumnBackground(newElement.id, newElement, documentManager)
      rebuildRawLayout(newElement.parent, { disableStacking: newRowElement.layout.disableStacking }, documentManager)
    }
    const updatedElement = documentManager.get(id)
    if (oldParent && updatedElement.parent) {
      storage.trigger(`element:${oldParent}`, documentManager.get(oldParent))
      if (oldParent !== updatedElement.parent) {
        storage.trigger(`element:${updatedElement.parent}`, documentManager.get(updatedElement.parent))
      }
    } else {
      storage.state('document').set(documentManager.children(false))
    }
    updateTimeMachine()
  })
  const mergeChildrenLayout = (data, parent) => {
    const children = Object.keys(data).filter((key) => {
      const element = data[ key ]
      return parent ? element.parent === parent : element.parent === '' || element.parent === parent
    })
    children.sort((a, b) => {
      if (typeof data[ a ].order === 'undefined') {
        data[ a ].order = 0
      }
      if (typeof data[ b ].order === 'undefined') {
        data[ b ].order = 0
      }
      return data[ a ].order - data[ b ].order
    })
    children.forEach((key) => {
      const element = data[ key ]
      const newId = utils.createKey()
      const oldId = '' + element.id
      if (substituteIds[ oldId ]) {
        element.id = substituteIds[ oldId ]
      } else {
        substituteIds[ oldId ] = newId
        element.id = newId
      }
      if (element.parent && substituteIds[ element.parent ]) {
        element.parent = substituteIds[ element.parent ]
      } else if (element.parent && !substituteIds[ element.parent ]) {
        substituteIds[ element.parent ] = utils.createKey()
        element.parent = substituteIds[ element.parent ]
      }
      delete element.order
      storage.trigger('add', element, false, { silent: true, action: 'merge' })
      mergeChildrenLayout(data, oldId)
    })
  }
  storage.on('merge', (content) => {
    const layoutData = JSON.parse(JSON.stringify(content))
    mergeChildrenLayout(layoutData, false)
    storage.state('document').set(documentManager.children(false), 'merge')
    substituteIds = {}
    updateTimeMachine()
  }, {
    debounce: 250,
    async: true
  })
  storage.on('reset', (data) => {
    let sanitizedData = sanitizeData(data)
    documentManager.reset(sanitizedData)
    historyStorage.trigger('init', sanitizedData)
    storage.state('document').set(documentManager.children(false), sanitizedData)
  })
  storage.on('updateAll', (data) => {
    documentManager.reset(sanitizeData(data))
    storage.state('document').set(documentManager.children(false), data)
  })
  storage.on('replace', (id, elementData, options = {}) => {
    let element = documentManager.get(id)
    if (!element) {
      return
    }
    let createdElements = []
    let cookElement = cook.get(elementData)
    if (!cookElement) {
      return
    }

    elementData = recursiveElementsRebuild(cookElement)
    let data = documentManager.create(elementData, {
      insertAfter: false
    })
    createdElements.push(data.id)

    let containerTags = [ 'tabsWithSlide', 'classicTabs', 'classicAccordion', 'pageableContainer' ]
    let children = documentManager.children(id)
    if (cookElement.containerFor() && containerTags.includes(cookElement.get('tag'))) {
      let childTag = cookElement.settings('containerFor').settings && cookElement.settings('containerFor').settings.options && cookElement.settings('containerFor').settings.options.elementDependencies && cookElement.settings('containerFor').settings.options.elementDependencies.tag
      if (children && childTag) {
        children.forEach(child => {
          let childId = child.id
          let editFormTabSettings = child.editFormTab1 || []
          let replaceElementMergeData = {
            tag: childTag,
            parent: cookElement.get('id')
          }
          editFormTabSettings.forEach(key => {
            replaceElementMergeData[ key ] = child[ key ]
          })
          storage.trigger('replace', childId, replaceElementMergeData)
        })
      }
    } else if (children) {
      children.forEach(child => {
        documentManager.appendTo(child.id, cookElement.get('id'))
      })
    }

    documentManager.delete(id)
    storage.state(`element:${id}`).delete()

    if (!options.silent) {
      storage.state('elementReplace').set({ id, data })
      storage.state('document').set(documentManager.children(false))
      updateTimeMachine()
    }
  })
})
