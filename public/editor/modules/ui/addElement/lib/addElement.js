import vcCake from 'vc-cake'
import React from 'react'
import {default as Categories} from './categories'

const cook = vcCake.getService('cook')
const DocumentData = vcCake.getService('document')

export default class AddElement extends React.Component {
  static propTypes = {
    api: React.PropTypes.object.isRequired,
    parent: React.PropTypes.string,
    options: React.PropTypes.object
  }
  getElementList () {
    let parentContainerFor = ['General']
    let allElements = cook.list.settings()
    let parentId = this.props.api.actions.getParent()
    if (parentId) {
      let data = DocumentData.get(parentId)
      let parent = cook.get(data)
      parentContainerFor = parent.containerFor()
    }
    return allElements.filter((elementData) => {
      let element = cook.get(elementData)
      return element.relatedTo(parentContainerFor)
    })
  }

  render () {
    let elements = this.getElementList()
    let content = <Categories elements={elements} api={this.props.api} options={this.props.options} />

    return (
      <div className='vcv-ui-tree-view-content vcv-ui-add-element-content'>
        {content}
      </div>
    )
  }
}
