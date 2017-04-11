import React from 'react'
import classnames from 'classnames'
import TinyMceEditor from 'react-tinymce'
import './css/skin.css'
import './css/content.css'
import './css/wpEditor.css'
import Attribute from '../attribute'
import lodash from 'lodash'
import vcCake from 'vc-cake'
import isEqual from 'is-equal'
export default class Component extends Attribute {
  constructor (props) {
    super(props)
    this.handleChangeQtagsEditor = this.handleChangeQtagsEditor.bind(this)
    this.id = `tinymce-htmleditor-component-${props.fieldKey}`
  }
  componentWillReceiveProps (nextProps) {
    if (!isEqual(this.props.value, nextProps.value) && vcCake.env('platform') !== 'wordpress') {
      console.log(this.id)
      window.tinymce.EditorManager.get(this.id).setContent(nextProps.value)
    }
    super.componentWillReceiveProps(nextProps)
  }
  handleChange (event, editor) {
    const value = editor.getContent()
    this.setFieldValue(value)
  }

  handleChangeWpEditor (editor) {
    const { updater, fieldKey } = this.props
    updater(fieldKey, editor.getContent())
  }

  handleChangeQtagsEditor (e) {
    const { updater, fieldKey } = this.props
    const field = e.target
    updater(fieldKey, field.value)
  }

  renderEditor () {
    let { value } = this.state
    let { options } = this.props
    let tinymceConfig = lodash.extend({}, {
      toolbar: [
        'styleselect | bold italic | link image | alignleft aligncenter alignright'
      ],
      skin: false,
      menubar: false
    }, options.tinymce)
    return (
      <div className='vcv-ui-form-input vcv-ui-form-tinymce'>
        <TinyMceEditor
          id={this.id}
          config={tinymceConfig}
          onChange={this.handleChange}
          onKeyup={this.handleChange}
          content={value} />
      </div>
    )
  }
  initWpEditorJs () {
    const { fieldKey } = this.props
    const id = `vcv-wpeditor-${fieldKey}`
    if (window.tinyMCEPreInit) {
      window.tinyMCEPreInit.mceInit[ id ] = Object.assign({}, window.tinyMCEPreInit.mceInit[ '__VCVID__' ], {
        id: id,
        selector: '#' + id,
        setup: (editor) => {
          editor.on('keyup change undo redo SetContent', this.handleChangeWpEditor.bind(this, editor))
        }
      })
      window.tinyMCEPreInit.qtInit[ id ] = Object.assign({}, window.tinyMCEPreInit.qtInit[ '__VCVID__' ], {
        id: id
      })
    }

    window.setTimeout(() => {
      window.quicktags && window.quicktags(window.tinyMCEPreInit.qtInit[ id ])
      window.switchEditors && window.switchEditors.go(id, 'tmce')
      if (window.QTags) {
        delete window.QTags.instances[ 0 ]
        if (window.QTags.instances[ id ]) {
          window.QTags.instances[ id ].canvas.addEventListener('keyup', this.handleChangeQtagsEditor)
        }
      }
      this.setState({editorLoaded: true})
    }, 0)
  }
  componentDidMount () {
    if (vcCake.env('FEATURE_HTML_EDITOR_WP_VERSION') && vcCake.env('platform') === 'wordpress') {
      this.initWpEditorJs()
    }
  }
  componentWillUnmount () {
    if (vcCake.env('FEATURE_HTML_EDITOR_WP_VERSION') && vcCake.env('platform') === 'wordpress') {
      const { fieldKey } = this.props
      const id = `vcv-wpeditor-${fieldKey}`
      window.tinyMCE && window.tinyMCE.editors[ id ].destroy()
      if (window.QTags && window.QTags.instances[ id ]) {
        window.QTags.instances[ id ].canvas.removeEventListener('keyup', this.handleChangeQtagsEditor)
        delete window.QTags.instances[ id ]
      }
    }
  }

  render () {
    if (vcCake.env('FEATURE_HTML_EDITOR_WP_VERSION') && vcCake.env('platform') === 'wordpress') {
      const { value } = this.state
      const { fieldKey } = this.props
      const id = `vcv-wpeditor-${fieldKey}`
      const template = document.getElementById('vcv-wpeditor-template').innerHTML
          .replace(/__VCVID__/g, id)
          .replace(/%%content%%/g, value)
      const cssClasses = classnames({
        'vcv-ui-form-wp-tinymce': true,
        'vcv-is-invisible': this.state.editorLoaded !== true
      })
      return <div className={cssClasses} dangerouslySetInnerHTML={{__html: template}} />
    }
    return this.renderEditor()
  }
}
