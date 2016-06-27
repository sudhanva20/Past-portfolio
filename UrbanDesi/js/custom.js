function wishlisted() {

    $('.root-nav .btn-wishlist').toggleClass('highlight');
}

var basket = 1;

function addtobasket() {
        $('.root-nav .btn-basket').addClass('highlight');
        $('.root-nav .btn-basket .num').text(basket);
        basket++;
        $('.notification-basket').addClass('show');
setTimeout(function () { 
    $('.notification-basket').removeClass('show');
}, 1000);
}



function togglefilter() {
  //this.$container.toggleClass("filter-opened");
        $(".template-grid").toggleClass("filter-open");
        $(".block-btn-filter").toggleClass("hide");

        $(".filters").toggleClass("show");
        $(".filters").toggleClass("fixed");
        $(".filters-cleaner").toggleClass("show");
        $(".btn-clear").toggleClass("selected");
        $(".btn-mobile-filter").toggleClass("selected");
        
        
        
}

