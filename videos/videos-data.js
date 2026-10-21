/*
 * Video library data. To add a video:
 *   1. Put the MP4 in videos/year-N/ (e.g. videos/year-8/fractions.mp4)
 *   2. Add one entry below.
 *
 * Paths are relative to this /videos/ folder, so they work on GitHub Pages
 * (https://mrdengmaths.github.io/barkermaths/videos/) and locally.
 *
 * Fields:
 *   id           unique, lower-case, no spaces
 *   title        shown on the card and in the viewer
 *   year         number (7, 8, 9 ...). Filter buttons are created from these automatically.
 *   topic        short topic name, shown on the placeholder thumbnail and on the card
 *   description  one short sentence
 *   video        path to the MP4, e.g. 'year-7/volume.mp4'
 *   poster       optional thumbnail image, e.g. 'year-7/volume.jpg' (leave '' for the placeholder)
 *   duration     optional, e.g. '3:25' (or a number of seconds)
 *   order        optional, lower numbers appear first within a year
 */
window.BARKER_VIDEOS = [
    {
        id: 'y7-volume',
        title: 'Understanding Volume',
        year: 7,
        topic: 'Volume',
        description: 'See how length (1D), area (2D) and volume (3D) build on each other.',
        video: 'year-7/volume.mp4',
        poster: '',
        duration: '2:20',
        order: 1
    },
    {
        id: 'y9-gradient',
        title: 'Gradient: Rise over Run',
        year: 9,
        topic: 'Gradient',
        description: 'Find the gradient of a straight line by counting the stairs: rise over run.',
        video: 'year-9/Gradient_Rise_Over_Run.mp4',
        poster: '',
        duration: '2:49',
        order: 1
    }
];
