# [EmojiBuilder](https://emoji.debijl.xyz/)

## Summary:  
Use Twitter's Open Source SVG emoji to build your own emoji/abominations.

## Roadmap:  
EmojiBuilder is still very much in development, check out the [roadmap project](https://github.com/Fdebijl/EmojiBuilder/projects/1) for all the function that should be implemented shortly. If you think something is missing, put in an issue above!

## Contributing & Building:
Yes please

Build your local copy by downloading or cloning the repo and doing the following:  
```SH
sudo apt-get install nodejs npm && sudo apt-get update
npm install
gulp
```

Build/update the emoji collection by running svg.php - this script is also set to run after npm install by default:
```SH
# You should also install git in the unlikely event you have not done so yet.
sudo apt-get install php && sudo apt-get update
# Assuming cwd is emojibuilder root
php -f fetcher/svg.php
```

When deploying you should only upload the following files:
```
css
favicon
img
js
svg_detailed
svg_latest
emojiworker.js
index.html
svgs_detailed.json
svgs_latest.json
manifest.json
```