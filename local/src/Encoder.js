'use strict'

const config = require('./config')

const JpegOpaqueEncoder = require('./JpegOpaqueEncoder')
const JpegAlphaEncoder = require('./JpegAlphaEncoder')
const PNGEncoder = require('./PNGEncoder')
const WlShmFormat = require('./protocol/wayland/WlShmFormat')

class Encoder {
  static create () {
    return new Encoder()
  }

  /**
   * Use Encoder.create() instead.
   * @private
   */
  constructor () {
    /**
     * @type {number}
     * @private
     */
    this._bufferFormat = null
    /**
     * @type {string}
     * @private
     */
    this._gstFormat = null
    /**
     * @type {JpegAlphaEncoder | JpegOpaqueEncoder}
     * @private
     */
    this._frameEncoder = null
    /**
     * @type {PNGEncoder}
     * @private
     */
    this._pngFrameEncoder = null
  }

  /**
   * @param {Buffer}pixelBuffer
   * @param {number}bufferFormat
   * @param {number}bufferWidth
   * @param {number}bufferHeight
   * @param {number}synSerial
   * @return {Promise<{type:number, width:number, height:number, synSerial:number, opaque: Buffer, alpha: Buffer}>}
   */
  encodeBuffer (pixelBuffer, bufferFormat, bufferWidth, bufferHeight, synSerial) {
    if (this._bufferFormat !== bufferFormat) {
      this._bufferFormat = bufferFormat
      this._gstFormat = Encoder.types[bufferFormat].gstFormat
      this._frameEncoder = null
    }

    const bufferArea = bufferWidth * bufferHeight
    if (bufferArea <= config['png-encoder']['max-target-buffer-size']) {
      return this._encodePNGFrame(pixelBuffer, bufferFormat, bufferWidth, bufferHeight, synSerial)
    } else {
      return this._encodeFrame(pixelBuffer, bufferFormat, bufferWidth, bufferHeight, synSerial)
    }
  }

  /**
   * @param {Buffer}pixelBuffer
   * @param {number}bufferFormat
   * @param {number}bufferWidth
   * @param {number}bufferHeight
   * @param {number}synSerial
   * @return {Promise<{type:number, width:number, height:number, synSerial:number, opaque: Buffer, alpha: Buffer}>}
   * @private
   */
  _encodePNGFrame (pixelBuffer, bufferFormat, bufferWidth, bufferHeight, synSerial) {
    if (!this._pngFrameEncoder) {
      this._pngFrameEncoder = PNGEncoder.create(bufferWidth, bufferHeight, this._gstFormat)
    }
    return this._pngFrameEncoder.encode(pixelBuffer, this._gstFormat, bufferWidth, bufferHeight, synSerial)
  }

  /**
   * @param {Buffer}pixelBuffer
   * @param {number}bufferFormat
   * @param {number}bufferWidth
   * @param {number}bufferHeight
   * @param {number}synSerial
   * @return {Promise<{type:number, width:number, height:number, synSerial:number, opaque: Buffer, alpha: Buffer}>}
   * @private
   */
  _encodeFrame (pixelBuffer, bufferFormat, bufferWidth, bufferHeight, synSerial) {
    if (!this._frameEncoder) {
      this._frameEncoder = Encoder.types[this._bufferFormat].FrameEncoder.create(bufferWidth, bufferHeight, this._gstFormat)
    }
    return this._frameEncoder.encode(pixelBuffer, this._gstFormat, bufferWidth, bufferHeight, synSerial)
  }
}

// wayland to gstreamer mappings
Encoder.types = {}
// TODO add more types
// TODO different frame encoders could probably share code from a common super class
Encoder.types[WlShmFormat.argb8888] = {
  gstFormat: 'BGRA',
  FrameEncoder: JpegAlphaEncoder
}
Encoder.types[WlShmFormat.xrgb8888] = {
  gstFormat: 'BGRx',
  FrameEncoder: JpegOpaqueEncoder
}

module.exports = Encoder
