
let candyData = [];
window.candyData = candyData;
window.addEventListener('load', () => {
    candyData = [].concat(candy12, candy3, candyOOD);
    window.candyData = candyData;
});
