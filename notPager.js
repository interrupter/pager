

var pager = {
    /*
     * Лучше грузить по 5-10 штук, иначе может подтормаживать при перестройке DOM
     * При переполнении кэша элементы в него не только добавляются, но и в том же кол-ве удаляются.
     * Все новые требуют время на инициализацию событий и т.д.
     * */
    //сколько грузить элементов за запрос
    COMPLECTS_PER_PAGE: 20,
    //размер кэша страниц в страницах
    MAX_PAGES_IN_CACHE: 2,
    //первая страница
    PAGE_NUMBER_MINIMUM: 1,
    //последняя обновляется каждый запрос из response.PAGES
    PAGE_NUMBER_MAXIMUM: 1,
    //правая и левая границы загруженных элементов в страницах
    //правая больше 0
    //левая только меньше 1
    //должно выполняться правило: (правая + модуль(левая)+1) меньше или равно максимальному числу страниц
    pageNumberCurrent: {
        left: null, //init values
        right: null //do not change!
    },
    //текущий размер кэша
    cacheSize: 0,
    //направление последней загрузки prev|next
    lastDirection: '',
    //блокировка загрузки
    apiBlocked: false,
    //текущий набор элементов
    complects: [],
    //от куда берем данные
    apiURL: '',
    //получаем данные для фильтра
    getFilterParams: function () {
        return {};
    },
    //установка параметров для загрузки данных, прокрутка вправо
    nextPage: function () {
        this.lastDirection = 'next';
        if (this.pageNumberCurrent.right===null){
            this.pageNumberCurrent.right=1;
        }else{
            this.pageNumberCurrent.right++;
        }
        //проверяем нет ли пересечения границ
        //нет
        if (this.checkBorders()){ return true;}
        //есть
        else{
            //откатываем параметры
            this.pageNumberCurrent.right--;
            //отменяем загрузку
            return false;
        }
    },
    //установка параметров для загрузки данных, прокрутка влево
    prevPage: function () {
        this.lastDirection = 'prev';
        if (this.pageNumberCurrent.left===null){
            this.pageNumberCurrent.left=0;
        }
        else{
            this.pageNumberCurrent.left--;
        }

        //проверяем нет ли пересечения границ
        //нет
        if (this.checkBorders()){ return true;}
        else{
            this.pageNumberCurrent.left++;
            return false;
        }
    },

    //проверяем не сходятся ли границы
    //если сходятся - загрузили уже все
    checkBorders: function(){
        return (this.pageNumberCurrent.right + Math.abs(this.pageNumberCurrent.left) <= this.PAGE_NUMBER_MAXIMUM);
    },

    // обработка загруженных данных
    addPage: function (data) {
        console.log('recieved', data);
        var cacheFull = false;
        this.PAGE_NUMBER_MAXIMUM = parseInt(data.PAGES);
        this.cacheSize++;
        //обновление хранимых данных
        switch (this.lastDirection) {
        case 'prev':
            //добавление новых
            this.complects = data.ELEMENTS.concat(this.complects);
            //проверка переполнения кэша
            if (this.cacheSize > this.MAX_PAGES_IN_CACHE) {
                //сокращение при переполнении
                this.complects = this.complects.slice(0, this.complects.length - this.COMPLECTS_PER_PAGE);
                this.cacheSize--;
                cacheFull=true;
            }
            break;
        case 'next':
            this.complects = this.complects.concat(data.ELEMENTS);
            //проверка переполнения кэша
            if (this.cacheSize > this.MAX_PAGES_IN_CACHE) {
                //сокращение при переполнении
                this.complects = this.complects.slice(this.COMPLECTS_PER_PAGE, this.complects.length);
                this.cacheSize--;
                cacheFull=true;
            }
            break;
        }
        //разблокируем загрузку, для синхронизации
        this.unBlockApi();
        console.log('CacheSize:', this.cacheSize);
        console.log('rebuilded complects:', this.complects);
        //теперь можно перестраивать DOM
        this.onPageLoad(this.complects, data.ELEMENTS, this.lastDirection, cacheFull);
    },

    //возвращает номер страницы для загрузки в зависимости от направления
    getRequestedPagesNumber: function () {
        switch (this.lastDirection) {
        case 'next':
            return this.pageNumberCurrent.right;
            break;
        case 'prev':
            return this.PAGE_NUMBER_MAXIMUM + this.pageNumberCurrent.left;
            break;
        }
    },

    //обращение к серверу за данными
    apiLoad: function () {
        var params = {
            filter: this.getFilterParams(),
            pageSize: this.COMPLECTS_PER_PAGE,
            pageNum: this.getRequestedPagesNumber()
        };
        //блокируем загрузку, для синхронизации
        this.blockApi();
        console.log('pager params:', jQuery.param(params));
        $.getJSON(this.apiURL+'?'+jQuery.param(params), this.addPage.bind(this));
    },

    //загрузка страницы вправо
    loadNextPage: function () {
        if (this.apiBlocked || !this.nextPage()) return;
        this.apiLoad();
    },

    //загрузка страницы влево
    loadPrevPage: function () {
        if (this.apiBlocked || !this.prevPage()) return;
        this.apiLoad();
    },

    //разблокировка загрузки
    unBlockApi: function () {
        this.apiBlocked = false;
    },
    //блокировка загрузки
    blockApi: function () {
        this.apiBlocked = true;
    },

    //сброс всех актуальных данных, переход в дефолтное состояние
    reset: function(){
        this.complects = [];
        this.cacheSize = 0;
        this.pageNumberCurrent = {left: null, right: null};
        this.lastDirection = '';
        this.apiBlocked = false;
    },

    //событие после загрузки и обработки данных
    onPageLoad: function (allData, newData, direction) {
        console.log('rebuildElements of complects');
    }

};
