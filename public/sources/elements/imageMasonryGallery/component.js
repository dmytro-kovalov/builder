/* global React, vcvAPI, vcCake */
/* eslint no-unused-vars: 0 */
class Component extends vcvAPI.elementComponent {
  imageSources = []
  imageOrder = {}

  constructor (props) {
    super(props)
    this.createCustomSizeImage = this.createCustomSizeImage.bind(this)
  }

  componentDidMount () {
    this.prepareImage(this.props.atts.image)
  }

  componentWillReceiveProps (nextProps) {
    let isEqual = require('lodash').isEqual
    if (!isEqual(this.getImageUrl(this.props.atts.image), this.getImageUrl(nextProps.atts.image))) {
      this.imageSources = []
      this.imageOrder = {}
      this.prepareImage(nextProps.atts.image)
    }
  }

  prepareImage (image) {
    if (image.id || (image[ 0 ] && image[ 0 ].id)) {
      this.setImageOrder(image)
      this.resizeImage(image)
    }
    let imgArr = []
    image.forEach((img) => {
      if (image && image.id) {
        imgArr.push({ imgSrc: this.getImageUrl(img) })
      } else {
        imgArr.push({ imgSrc: this.getImageUrl(img) })
      }
    })
    this.setImgSrcState(imgArr)
  }

  setImageOrder (imageArray) {
    imageArray.forEach((image, index) => {
      this.imageOrder[ index ] = image.id
    })
  }

  checkImageSize (image, callback, imgCount) {
    let img = new window.Image()
    img.onload = () => {
      let size = {
        width: img.width,
        height: img.height
      }
      callback(image, size, imgCount)
    }
    img.src = this.getImageUrl(image, 'medium')
  }

  resizeImage (imageArray) {
    imageArray.forEach((image) => {
      this.checkImageSize(image, this.createCustomSizeImage, imageArray.length)
    })
  }

  createCustomSizeImage (image, size, imgCount) {
    image.orientation = this.checkOrientation(size)
    this.imageSources.push(image)

    if (this.imageSources.length === imgCount) {
      this.orderImages()
    }
  }

  orderImages () {
    let imagesInOrder = []
    this.imageSources.forEach((img, index) => {
      let imgObj = this.imageSources.filter((obj) => {
        return obj.id === this.imageOrder[ index ]
      })
      imagesInOrder.push({
        imgSrc: this.getImageUrl(imgObj[ 0 ], 'large'),
        orientation: imgObj[ 0 ].orientation,
        originalSrc: this.getImageUrl(imgObj[ 0 ]),
        alt: imgObj[ 0 ].alt,
        title: imgObj[ 0 ].title
      })
    })

    this.setImgSrcState(imagesInOrder)
  }

  checkOrientation (size) {
    return size.width >= size.height ? 'landscape' : 'portrait'
  }

  setImgSrcState (imgSrc) {
    this.setState({ imgSrc })
  }

  getPublicImage (filename) {
    let { tag } = this.props.atts

    let assetsManager
    if (vcCake.env('FEATURE_ASSETS_MANAGER')) {
      assetsManager = vcCake.getService('wipAssetsManager')
    } else {
      assetsManager = vcCake.getService('assets-manager')
    }

    return assetsManager.getPublicPath(tag, filename)
  }

  getImageUrl (image, size) {
    let imageUrl
    // Move it to attribute
    if (size && image && image[ size ]) {
      imageUrl = image[ size ]
    } else {
      if (image instanceof Array) {
        let urls = []
        image.forEach((item) => {
          urls.push(item && item.full ? item.full : this.getPublicImage(item))
        })
        imageUrl = urls
      } else {
        imageUrl = image && image.full ? image.full : this.getPublicImage(image)
      }
    }

    return imageUrl
  }

  render () {
    let { id, atts, editor } = this.props
    let { image, designOptions, shape, clickableOptions, customClass, columns } = atts
    let containerClasses = 'vce-image-masonry-gallery'
    let wrapperClasses = 'vce-image-masonry-gallery-wrapper vce'
    let containerProps = {}
    let CustomTag = 'div'
    let imgSrc = this.state && this.state.imgSrc

    if (typeof customClass === 'string' && customClass) {
      containerClasses += ' ' + customClass
    }

    let mixinData = this.getMixinData('imageGalleryGap')
    if (mixinData) {
      containerClasses += ` vce-image-masonry-gallery--gap-${mixinData.selector}`
    }

    mixinData = this.getMixinData('imageGalleryColumns')
    if (mixinData) {
      containerClasses += ` vce-image-masonry-gallery--columns-${mixinData.selector}`
    }

    if (shape === 'rounded') {
      containerClasses += ' vce-image-masonry-gallery--border-rounded'
    }

    if (shape === 'round') {
      containerClasses += ' vce-image-masonry-gallery--border-round'
    }

    let devices = designOptions.visibleDevices ? Object.keys(designOptions.visibleDevices) : []
    let animations = []
    devices.forEach((device) => {
      let prefix = designOptions.visibleDevices[ device ]
      if (designOptions[ device ].animation) {
        if (prefix) {
          prefix = `-${prefix}`
        }
        animations.push(`vce-o-animate--${designOptions[ device ].animation}${prefix}`)
      }
    })
    if (animations.length) {
      containerProps[ 'data-vce-animate' ] = animations.join(' ')
    }

    let galleryItems = []

    imgSrc && imgSrc.forEach((src, index) => {
      let customProps = {}
      let classes = 'vce-image-masonry-gallery-item'
      let imgClasses = 'vce-image-masonry-gallery-img'
      let customImageProps = {
        'alt': src && src.alt ? src.alt : '',
        'title': src && src.title ? src.title : ''
      }

      if (clickableOptions === 'url' && image[ index ].link && image[ index ].link.url) {
        CustomTag = 'a'
        let { url, title, targetBlank, relNofollow } = image[ index ].link
        customProps = {
          'href': url,
          'title': title,
          'target': targetBlank ? '_blank' : undefined,
          'rel': relNofollow ? 'nofollow' : undefined
        }
      } else if (clickableOptions === 'imageNewTab') {
        CustomTag = 'a'
        customProps = {
          'href': src.originalSrc || src.imgSrc,
          'target': '_blank'
        }
      } else if (clickableOptions === 'lightbox') {
        CustomTag = 'a'
        customProps = {
          'href': src.originalSrc || src.imgSrc,
          'data-lightbox': `lightbox-${id}`
        }
      }

      galleryItems.push(
        <CustomTag {...customProps} className={classes} key={`vce-image-masonry-gallery-item-${index}-${id}`}>
          <img className={imgClasses} src={src.imgSrc} {...customImageProps} />
        </CustomTag>
      )
    })

    return (
      <div className={containerClasses} {...editor} {...containerProps}>
        <div className={wrapperClasses} id={'el-' + id}>
          <div className='vce-image-masonry-gallery-list'>
            {galleryItems}
          </div>
        </div>
      </div>
    )
  }
}
