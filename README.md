# IWF Hackathon 2023 

## Challenge 7

Compares broken images in the `samples/broken` directory with a complete image in the `samples/complete` directory.

Uses node.js CLI and [pixelmatch](https://www.npmjs.com/package/pixelmatch) to compare images using colour differences.

## Install

```
nvm use
npm install
npm start
```

## Future work

* Save results to a DB.
* Create a UI to upload broken images and show top matching complete images. (maybe use bulma for UI framework so it's kept simple?)
* Upload will work out if the files are corrupt and put them into the correct image directory.
* Accept a binary image file (this is what IWF use), maybe use node ssdeep package? Compares the hash of two images. 
* Does this work if the images are the same but the pictures are different sizes?

## Notes

To make a broken image:

```
head -c 50000 sample1.jpg > sample1_broken.jpg 
```
