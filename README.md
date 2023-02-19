# IWF Hackathon 2023 

## Challenge 7

Compares broken images in the `samples/broken` directory with a complete image in the `samples/complete` directory.

Uses node.js CLI 

## Install

```
nvm use
npm install
npm start
```

## Future work

* Compare broken images to more than one complete image.
* Save results to a DB.
* Create a UI to upload broken images and show results.

## Notes

To make a broken image:

```
head -c 50000 sample1.jpg > sample1_broken.jpg 
```
