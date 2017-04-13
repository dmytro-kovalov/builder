// @flow
import vcCake from 'vc-cake'
// import React from 'react'
import './sources/less/bootstrap/init.less'
import './sources/css/wordpress.less'
import './config/variables'
import './config/wp-services'
import './config/wp-attributes'

const $ = require('expose?$!jquery')
$(() => {
  console.log('test')
  let $iframe = $('#vcv-editor-iframe')
  // Get a handle to the iframe element
  let iframe = $iframe.get(0)
  let iframeDoc = iframe.contentDocument || iframe.contentWindow.document

  let iframeLoadEvent = () => {
    let iframe = $iframe.get(0).contentWindow
    let iframeDocument = iframe.document
    // Disable iframe clicks
    $(iframeDocument.body).on('click', 'a[href]', (e) => {
      e && e.preventDefault()
    })
    $('[data-vcv="edit-fe-editor"]', iframeDocument).remove()
    vcCake.env('platform', 'wordpress').start(() => {
      require('./editor/stores/elements/elementsStorage')
      require('./editor/stores/assets/assetsStorage')
      require('./editor/stores/workspaceStorage')
      require('./editor/stores/history/historyStorage')
      require('./editor/stores/history/elementHistoryStorage')
      require('./editor/stores/settingsStorage')
      require('./editor/stores/wordpressData/wordpressDataStorage')
      require('./config/wp-modules')
    })
    vcCake.env('iframe', iframe)
  }

  $iframe.on('load', iframeLoadEvent)
  // Check if loading is complete
  if (iframeDoc && iframeDoc.readyState === 'complete') {
    iframeLoadEvent()
  }
})

window.app = vcCake
// window.vcvAddElement = vcCake.getService('cook').add
// window.React = React
// window.vcvAPI = vcCake.getService('api')
// if (!vcCake.env('FEATURE_WEBPACK')) {
//   require('./config/elements')
// }

// import './sources/newElements/row'
// import './sources/newElements/column'
// import './sources/newElements/textBlock'
