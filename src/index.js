const sharp = require('sharp')
const PNG = require('pngjs').PNG
const pixelmatch = require('pixelmatch')
const fs = require('node:fs/promises')
const os = require('os')

const comparer = {}

comparer.getDir = async (path) => {
    return await fs.readdir(`samples/${path}`)
  }

comparer.getTempDirName = async () => {
  if(!comparer.__tempDirName){
    comparer.__tempDirName = await fs.mkdtemp(os.tmpdir())
  }
  return comparer.__tempDirName
}

comparer.isCorrupt = async (jpeg) => {
    const image = sharp(jpeg)
    try {
        await image.stats()
        return false
    } catch (error) {
        return true
    }
}

comparer.getSmallestImageSize = async (img1, img2) => {
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

    return newImageSize

}

comparer.getImageSizeForCorrupt = async (imageDimensions, fraction) => {
    const reducedImageHeight = imageDimensions.height / fraction

    const newImageSize = {
        width: imageDimensions.width,
        height: reducedImageHeight
    }

    return newImageSize
}

comparer.cropImage = async (img1, img2, imageSize) => {
    const imageToCrop1 = await sharp(img1, { failOnError: false })
    const imageToCrop2 = await sharp(img2, { failOnError: false })

    // Had to add Math.trunc() because the extract function does not like decimals
    const cropped1 = await imageToCrop1.extract({left: 0, width: Math.trunc(imageSize.width), height: Math.trunc(imageSize.height), top: 0})
    const cropped2 = await imageToCrop2.extract({left: 0, width: Math.trunc(imageSize.width), height: Math.trunc(imageSize.height), top: 0})
    
    const tempDir = await comparer.getTempDirName()
    
    const fileName1 = tempDir + `/img1_${imageSize.width}_${imageSize.height}.png`
    const fileName2 = tempDir + `/img2_${imageSize.width}_${imageSize.height}.png`

    await cropped1.toFile(fileName1)
    await cropped2.toFile(fileName2)

    return [
        fileName1, fileName2
    ]
}

comparer.compare = async (files) => {
    const croppedImg1 = files[0]
    const croppedImg2 = files[1]

    const img1Object = PNG.sync.read(await fs.readFile(croppedImg1))
    const img2Object = PNG.sync.read(await fs.readFile(croppedImg2))
    
    const {width, height} = img1Object

    const numDiffPixels = pixelmatch(img1Object.data, img2Object.data, null, width, height)

    const pixelsMatching = width * height - numDiffPixels
    const total = width * height
    const percent = 100 - (((total - pixelsMatching) / total) * 100)
    const result = {
        numDiffPixels,
        matchingPercent: percent
        }
    return result
}

comparer.compareImages = async (img1, img2) => {

    // check if corrupt
    if (await comparer.isCorrupt(img1) || await comparer.isCorrupt(img2)){
        const result = {}

        const dimensions = [
            {name: 'wholeImage', fraction: 1}, 
            {name: 'topHalf', fraction: 2}, 
            {name: 'topThird', fraction: 3}, 
            {name: 'topQuarter', fraction: 4}
        ]

        const promises = dimensions.map(async(dimension) => {
            const imageDimensions = await comparer.getSmallestImageSize(img1, img2)
            const sizes = await comparer.getImageSizeForCorrupt(imageDimensions, dimension.fraction)
            const files = await comparer.cropImage(img1, img2, sizes)
            result[dimension.name] = await comparer.compare(files)
        })

        await Promise.all(promises)
        console.log(result)
        return result
    }

    // Maybe this should be removed if we are only going to be comparing complete vs corrupt images? 
    // However we could use the isCorrupt function to work out if they are corrupt when uploaded?
    // when neither file is corrupt
    const imageDimensions = await comparer.getSmallestImageSize(img1, img2)
    const files = await comparer.cropImage(img1, img2, imageDimensions)
    const result = await comparer.compare(files)
    console.log(result)
    return result
}

const main = async () => {
    const broken = await comparer.getDir('broken')
    const fixed = await comparer.getDir('complete')

  for (b in broken) {
    for (f in fixed){
        const brokenFile = 'samples/broken/' + broken[b]
        const completeFile = 'samples/complete/' + fixed[f]
        console.log('Comparing broken image: ', brokenFile, 'to: ', completeFile)
        await comparer.compareImages(completeFile, brokenFile)
    }
  }
}

main().catch((e) => {
    console.log(e)
})
