import React from 'react'
import { getService } from 'vc-cake'

const vcvAPI = getService('api')
const renderProcessor = getService('renderProcessor')
const { getBlockRegexp, parseDynamicBlock } = getService('utils')
const blockRegexp = getBlockRegexp()

export default class SingleImageElement extends vcvAPI.elementComponent {
  promise = null

  static image = null

  constructor (props) {
    super(props)

    this.state = {
      imgElement: null,
      parsedWidth: null,
      parsedHeight: null,
      naturalWidth: null,
      naturalHeight: null
    }

    this.setImage = this.setImage.bind(this)
    this.setImageState = this.setImageState.bind(this)
    this.setError = this.setError.bind(this)
  }

  componentDidMount () {
    this.promise = new window.Promise((resolve, reject) => {
      this.resolve = resolve
      this.setImage(this.props)
    })
    renderProcessor.add(this.promise)
  }

  componentWillUnmount () {
    SingleImageElement.image && SingleImageElement.image.removeEventListener('load', this.setImageState)
    SingleImageElement.image && SingleImageElement.image.removeEventListener('error', this.setError)
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevProps.atts.image !== this.props.atts.image) {
      this.setImage(this.props)
    } else if (prevProps.atts.size !== this.props.atts.size) {
      this.resetImageSizeState()
    } else if (prevProps.atts.shape !== this.props.atts.shape) {
      this.resetImageSizeState()
    }
  }

  parseSize (size, isRound, naturalWidth, naturalHeight) {
    let crop = true
    if (typeof size === 'string') {
      size = size.replace(/\s/g, '').replace(/px/g, '').toLowerCase().split('x')
    } else if (typeof size === 'object') {
      crop = size.crop
      size = [ size.width, size.height ]
    }

    naturalWidth = parseInt(naturalWidth)
    naturalHeight = parseInt(naturalHeight)

    const cropHorizontal = parseInt(size[ 0 ]) < naturalWidth
    const cropVertical = parseInt(size[ 1 ]) < naturalHeight

    if (crop) {
      size[ 0 ] = parseInt(size[ 0 ]) < naturalWidth ? parseInt(size[ 0 ]) : naturalWidth
      size[ 1 ] = parseInt(size[ 1 ]) < naturalHeight ? parseInt(size[ 1 ]) : naturalHeight
    } else {
      size[ 0 ] = cropHorizontal ? parseInt(size[ 0 ]) : naturalWidth
      size[ 1 ] = cropVertical ? parseInt(size[ 1 ]) : naturalHeight

      if (cropHorizontal && !cropVertical) {
        const prop = size[ 0 ] / naturalWidth
        size[ 1 ] = parseInt(naturalHeight * prop)
      }

      if (cropVertical && !cropHorizontal) {
        const prop = size[ 1 ] / naturalHeight
        size[ 0 ] = parseInt(naturalWidth * prop)
      }

      if (cropVertical && cropHorizontal) {
        if (naturalHeight < naturalWidth) {
          const prop = size[ 0 ] / naturalWidth
          size[ 1 ] = parseInt(naturalHeight * prop)
        } else {
          const prop = size[ 1 ] / naturalHeight
          size[ 0 ] = parseInt(naturalWidth * prop)
        }
      }
    }

    if (isRound) {
      let smallestSize = size[ 0 ] >= size[ 1 ] ? size[ 1 ] : size[ 0 ]
      size = {
        width: smallestSize,
        height: smallestSize
      }
    } else {
      size = {
        width: size[ 0 ],
        height: size[ 1 ]
      }
    }
    return size
  }

  checkRelatedSize (size) {
    let relatedSize = null
    if (window.vcvImageSizes && window.vcvImageSizes[ size ]) {
      relatedSize = window.vcvImageSizes[ size ]
    }
    return relatedSize
  }

  getSizes (atts, img) {
    let { size, shape } = atts
    size = size.replace(/\s/g, '').replace(/px/g, '').toLowerCase()

    let parsedSize = ''

    if (size.match(/\d+(x)\d+/)) {
      parsedSize = this.parseSize(size, shape === 'round', img.width, img.height)
    } else {
      parsedSize = this.checkRelatedSize(size)

      if (parsedSize) {
        parsedSize = this.parseSize(parsedSize, shape === 'round', img.width, img.height)
      } else {
        parsedSize = this.parseSize({ width: img.width, height: img.height }, shape === 'round', img.width, img.height)
      }
    }

    return {
      width: parsedSize.width,
      height: parsedSize.height
    }
  }

  setImage (props) {
    const imgSrc = this.getImageUrl(props.atts.image)

    SingleImageElement.image && SingleImageElement.image.removeEventListener('load', this.setImageState)
    SingleImageElement.image && SingleImageElement.image.removeEventListener('error', this.setError)

    SingleImageElement.image = new window.Image()

    SingleImageElement.image.addEventListener('load', this.setImageState)
    SingleImageElement.image.addEventListener('error', this.setError)

    if (imgSrc) {
      SingleImageElement.image.src = imgSrc
    } else {
      this.setError()
    }
    if (!imgSrc) {
      this.setState({
        imgElement: null,
        parsedWidth: null,
        parsedHeight: null,
        naturalWidth: null,
        naturalHeight: null
      })
    }
  }

  setImageState (e) {
    const img = e.currentTarget
    const sizes = this.getSizes(this.props.atts, img)

    this.setState({
      imgElement: img,
      parsedWidth: sizes.width,
      parsedHeight: sizes.height,
      naturalWidth: img.width,
      naturalHeight: img.height
    }, () => {
      this.resolve && this.resolve(true)
    })
  }

  resetImageSizeState () {
    const sizes = this.getSizes(this.props.atts, this.state.imgElement)
    this.setState({
      parsedWidth: sizes.width,
      parsedHeight: sizes.height
    })
  }

  setError () {
    this.resolve && this.resolve(false)
  }

  getImageShortcode (options) {
    const { props, classes, isDefaultImage, src, isDynamicImage } = options
    let shortcode = `[vcvSingleImage class="${classes}" data-width="${this.state.parsedWidth || 0}" data-height="${this.state.parsedHeight || 0}" src="${src}" data-img-src="${props[ 'data-img-src' ]}" alt="${props.alt}" title="${props.title}"`

    if (isDefaultImage) {
      shortcode += ' data-default-image="true"'
    }

    if (isDynamicImage) {
      let blockInfo = parseDynamicBlock(this.props.rawAtts.image.full)
      shortcode += ` data-dynamic="${blockInfo.blockAtts.value}"`
    }

    shortcode += ']'

    return shortcode
  }

  render () {
    let { id, atts, editor } = this.props
    let { shape, clickableOptions, showCaption, customClass, size, alignment, metaCustomId, image } = atts
    let containerClasses = 'vce-single-image-container'
    let wrapperClasses = 'vce vce-single-image-wrapper'
    let classes = 'vce-single-image-inner'
    let imageClasses = 'vce-single-image'
    let customProps = {}
    let containerProps = {}
    let wrapperProps = {}
    let CustomTag = 'div'
    let customImageProps = {}
    let imgSrc = this.getImageUrl(image)

    customImageProps[ 'data-img-src' ] = imgSrc
    customImageProps[ 'alt' ] = image && image.alt ? image.alt : ''
    customImageProps[ 'title' ] = image && image.title ? image.title : ''

    if (typeof customClass === 'string' && customClass) {
      containerClasses += ' ' + customClass
    }

    if (clickableOptions === 'url' && image && image.link && image.link.url) {
      CustomTag = 'a'
      let { url, title, targetBlank, relNofollow } = image.link
      customProps = {
        'href': url,
        'title': title,
        'target': targetBlank ? '_blank' : undefined,
        'rel': relNofollow ? 'nofollow' : undefined
      }
    } else if (clickableOptions === 'imageNewTab') {
      CustomTag = 'a'
      customProps = {
        'href': imgSrc,
        'target': '_blank'
      }
    } else if (clickableOptions === 'lightbox') {
      CustomTag = 'a'
      customProps = {
        'href': imgSrc,
        'data-lightbox': `lightbox-${id}`
      }
    } else if (clickableOptions === 'zoom') {
      classes += ' vce-single-image-zoom-container'
    } else if (clickableOptions === 'photoswipe') {
      CustomTag = 'a'
      customProps = {
        'href': imgSrc,
        'data-photoswipe-image': id,
        'data-photoswipe-index': 0
      }
      wrapperProps[ 'data-photoswipe-item' ] = `photoswipe-${id}`
      if (showCaption) {
        customProps[ 'data-photoswipe-caption' ] = image.caption
      }
      containerProps[ 'data-photoswipe-gallery' ] = id
    }

    if (alignment) {
      containerClasses += ` vce-single-image--align-${alignment}`
    }

    if (shape === 'rounded') {
      classes += ' vce-single-image--border-rounded'
    }

    if (shape === 'round') {
      classes += ' vce-single-image--border-round'
    }

    if (metaCustomId) {
      containerProps.id = metaCustomId
    }

    let doAll = this.applyDO('all')
    let caption = null

    if (image && image.caption) {
      caption = (
        <figcaption>
          {image.caption}
        </figcaption>
      )
    }
    const imageForFilter = image && image.urls && image.urls.length ? image.urls[ 0 ] : image

    if (imageForFilter && imageForFilter.filter && imageForFilter.filter !== 'normal') {
      classes += ` vce-image-filter--${imageForFilter.filter}`
    }

    let imgElement = ''

    let rawImage = this.props.rawAtts.image && this.props.rawAtts.image.full

    const isDynamic = Array.isArray(typeof rawImage === 'string' && rawImage.match(blockRegexp))
    const shortcodeOptions = {
      props: customImageProps,
      classes: imageClasses,
      isDefaultImage: !(image && image.id),
      src: imgSrc,
      isDynamicImage: isDynamic
    }

    if (imgSrc) {
      imgElement = (
        <img className={`${imageClasses} vcvhelper`} src={imgSrc} {...customImageProps} data-vcvs-html={this.getImageShortcode(shortcodeOptions)} />
      )
    }

    // Set original image if not resized
    if (size === 'full' && shape !== 'round' && !isDynamic) {
      imgElement = (
        <img className={imageClasses} src={imgSrc} {...customImageProps} />
      )
    }

    return <div className={containerClasses} {...editor} {...containerProps}>
      <div className={wrapperClasses} {...wrapperProps} id={'el-' + id} {...doAll}>
        <figure>
          <CustomTag {...customProps} className={classes} ref='imageContainer' style={{ paddingBottom: `${(this.state.parsedHeight / this.state.parsedWidth) * 100}%`, width: this.state.parsedWidth }}>
            {imgElement}
          </CustomTag>
          {caption}
        </figure>
      </div>
    </div>
  }
}
