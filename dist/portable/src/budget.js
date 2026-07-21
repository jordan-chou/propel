var whitelist = [
    "MeasureBullet",
    "BoxTitle-1-White",
    "boxtextnormal",
    "BoxTitle-2",
    "flagbullettexttable"
];

var styles = [];

for (var s of whitelist) {
    styles.push(`p.${s} => p.${s}`); // ex. "p.MeasureBullet => p.MeasureBullet"
}

// Mammoth options
const options = {
    // styleMap: styles
    styleMap: ["p.MeasureBullet => ul.media-list.lst-spcd.mrgn-tp-md.mrgn-bttm-md > li.media:fresh > div.media-body"]
};

// TODO: convert class into image bullet
function convertToMeasureBullet() {
    
}