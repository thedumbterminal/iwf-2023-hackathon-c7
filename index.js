const broken = 'samples/sample1_broken.jpg'
const notBroken = 'samples/sample1.jpg'
const thor = 'samples/thor.png'

var sharp = require('sharp')
const fs = require('fs');
const PNG = require('pngjs').PNG
const pixelmatch = require('pixelmatch')

const isCorrupt = async (jpeg) => {
    const image = sharp(jpeg)
    try {
        await image.stats()
        return false
    } catch (error) {
        return true
    }
}

const getSmallestImageSize = async (img1, img2) => {
    const img1Formatted = sharp(img1, {failOnError: false})
    const img2Formatted = sharp(img2, {failOnError: false})

    const img1MetaData = await img1Formatted.metadata()
    const img2MetaData = await img2Formatted.metadata()

    const img1Width = img1MetaData.width
    const img1Height = img1MetaData.height

    const img2Width = img2MetaData.width
    const img2Height = img2MetaData.height

    const smallestImageWidth = img1Width <= img2Width ? img1Width : img2Width
    const smallestImageHeight = img1Height <= img2Height ? img1Height : img2Height

    const newImageSize = {
        width: smallestImageWidth,
        height: smallestImageHeight
    }

    console.log('** Smallest picture size ** >> ', newImageSize)
    return newImageSize

}

const getImageSizeForCorrupt = async (jpeg, fraction) => {
    const imageToBeSized = sharp(jpeg, {failOnError: true})
    const imageMetaData = await imageToBeSized.metadata()

    const imageWidth = imageMetaData.width
    const imageHeight = imageMetaData.height

    const reducedImageHeight = imageHeight / fraction

    const newImageSize = {
        width: imageWidth,
        height: reducedImageHeight
    }

    console.log('** New image size ** >> ', newImageSize)
    return newImageSize
}

const cropImage = async (img1, img2, imageSize) => {
    const imageToCrop1 = await sharp(img1, { failOnError: false })
    const imageToCrop2 = await sharp(img2, { failOnError: false })

    const cropped1 = await imageToCrop1.extract({left: 0, width: imageSize.width, height: imageSize.height, top: 0})
    const cropped2 = await imageToCrop2.extract({left: 0, width: imageSize.width, height: imageSize.height, top: 0})
    
    const fileName1 = __dirname + `/processed_images/img1_${imageSize.width}_${imageSize.height}.png`
    const fileName2 = __dirname + `/processed_images/img2_${imageSize.width}_${imageSize.height}.png`

    await cropped1.toFile(fileName1)
    await cropped2.toFile(fileName2)

    return [
        fileName1, fileName2
    ]
}

const compare = async (files) => {
    const croppedImg1 = files[0]
    const croppedImg2 = files[1]

    const img1Object = PNG.sync.read(fs.readFileSync(croppedImg1))
    const img2Object = PNG.sync.read(fs.readFileSync(croppedImg2))
    
    const {width, height} = img1Object

    const numDiffPixels = pixelmatch(img1Object.data, img2Object.data, null, width, height)

    const pixelsMatching = width * height - numDiffPixels
    const total = width * height
    const percent = 100 - (((total - pixelsMatching) / total) * 100)
    const result = {
        numDiffPixels,
        percent
        }
    return result
}

const compareImages = async (img1, img2) => {

    // check if corrupt
    if (await isCorrupt(img1) || await isCorrupt(img2)){
        const result = {}

        const dimensions = [
            {name: 'wholeImage', fraction: 1}, 
            {name: 'topHalf', fraction: 2}, 
            {name: 'topThird', fraction: 3}, 
            {name: 'topQuarter', fraction: 4}
        ]

        const promises = dimensions.map(async(dimension) => {
            const sizes = await getImageSizeForCorrupt(img1, dimension.fraction)

            const files = await cropImage(img1, img2, sizes)
             result[dimension.name] = await compare(files)
        })

        await Promise.all(promises)

        console.log(result)
        return result
    }

    // when neither file is corrupt
    const imageDimensions = await getSmallestImageSize(img1, img2)
    const files = await cropImage(img1, img2, imageDimensions)
    const result = await compare(files)
    console.log(result)
    return result
}

// *******************************************************
// compareImages(notBroken, thor).catch((e) => {
//     console.log(e)
// })

compareImages(notBroken, broken).catch((e) => {
    console.log(e)
})