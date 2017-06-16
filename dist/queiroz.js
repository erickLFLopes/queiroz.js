
/*!
 * Queiroz.js: view.js
 * JavaScript Extension for Dimep Kairos
 * https://github.com/viniciusknob/queiroz.js
 */

(function(window) {

    /* Constants */

    var NAME = 'view';


    /* Module Definition */

    var View = function() {

        /* PUBLIC */

        return {
            append: function(selector, html) {
                var _this = this;
                _this.asyncReflow(function() {
                    var
                        element = _this.get(selector),
                        container = document.createElement('div');

                    container.innerHTML = html;
                    element.appendChild(container);
                });
            },
            asyncReflow: function(task) {
                setTimeout(task, 25);
            },
            get: function(selector, target) {
                return (target || document).querySelector(selector);
            },
            getAll: function(selector, target) {
                return (target || document).querySelectorAll(selector);
            }
        };
    }();

    window[NAME] = View;

})(window);

/*!
 * Queiroz.js: time.js
 * JavaScript Extension for Dimep Kairos
 * https://github.com/viniciusknob/queiroz.js
 */

(function(window) {

    /* Constants */

    var NAME = 'time';


    /* Module Definition */

    var Time = function() {

        var
            // Date object, getDay() method returns the weekday as a number
            Weekday = {
                SUNDAY: 0,
                MONDAY: 1,
                TUESDAY: 2,
                WEDNESDAY: 3,
                THURSDAY: 4,
                FRIDAY: 5,
                SATURDAY: 6
            },
            _normalize = function(number) {
                return (number < 10 ? '0' + number : number);
            },
            _Hour = (function() {
                return {
                    toMillis: function(hour) {
                        return hour * _Millis.IN_HOUR;
                    }
                };
            })(),
            _Minute = (function() {
                return {
                    toMillis: function(minute) {
                        return minute * _Millis.IN_MINUTE;
                    }
                };
            })(),
            _Millis = (function() {

                var
                    MINUTE_IN_MILLIS = 1000 * 60,
                    HOUR_IN_MILLIS = MINUTE_IN_MILLIS * 60;

                /* PUBLIC */

                return {
                    IN_MINUTE: MINUTE_IN_MILLIS,
                    IN_HOUR: HOUR_IN_MILLIS,
                    diff: function(init, end) {
                        if (init instanceof Date && end instanceof Date) {
                            return end.getTime() - init.getTime();
                        } else {
                            return end - init;
                        }
                    },
                    toHumanTime: function(millis) {
                        var
                            diffHour = parseInt(millis / HOUR_IN_MILLIS),
                            diffMin = parseInt((millis / MINUTE_IN_MILLIS) % 60);

                        return _normalize(diffHour) + ':' + _normalize(diffMin);
                    }
                };
            })();

        /* PUBLIC */

        return {
            Hour: _Hour,
            Minute: _Minute,
            Millis: _Millis,
            Weekday: Weekday,
            dateToHumanTime: function(date) {
                return _normalize(date.getHours()) + ':' + _normalize(date.getMinutes());
            },
            isToday: function(date) {
                var today = new Date();
                return date.getDate() === today.getDate() &&
                       date.getMonth() === today.getMonth() &&
                       date.getFullYear() === today.getFullYear();
            },
            toDate: function(stringDate) { // 14_05_2017 16:08
                var
                    dateTime = stringDate.split(' '),
                    date = dateTime[0].split('_'),
                    time = dateTime[1].split(':');
                return new Date(date[2], date[1] - 1, date[0], time[0], time[1]);
            }
        };
    }();

    window[NAME] = Time;

})(window);

/*!
 * Queiroz.js: util.js
 * JavaScript Extension for Dimep Kairos
 * https://github.com/viniciusknob/queiroz.js
 */

(function(window) {

    /* Constants */

    var NAME = 'util';


    /* Module Definition */

    var Util = function() {

        /* PUBLIC */

        return {
            textFormat: function(pattern, args) {
                for (var index = 0; index < args.length; index++) {
                    var regex = new RegExp('\\{' + index + '\\}', 'g');
                    pattern = pattern.replace(regex, args[index]);
                }
                return pattern;
            }
        };
    }();

    window[NAME] = Util;

})(window);

/*!
 * Queiroz.js: main.js
 * JavaScript Extension for Dimep Kairos
 * https://github.com/viniciusknob/queiroz.js
 */

(function(window, View, Time, Util) {

    /* Constants */

    var NAME = 'Queiroz';


    /* Module Definition */

    var Queiroz = function() {

        /* CONSTANTS */

        var
            _NAME = 'Queiroz.js',
            VERSION = '2.7.2',

            Settings = {
                INITIAL_WEEKDAY: Time.Weekday.MONDAY,
                LAST_WEEK_MODE: false, // false, ON, DOING, DONE
                MAX_CONSECUTIVE_HOURS_PER_DAY: 6,
                MAX_HOURS_PER_WEEK: 44,
                MAX_MINUTES_PER_DAY: (8 * 60) + 48,
                TAMPERMONKEY_DELAY_MILLIS: 1000
            },

            Selector = {
                COLUMN_DAY: '.DiaApontamento',
                CHECKPOINT: '.FilledSlot span',
                DATE: '[id^=hiddenDiaApont]',
                HEADER: '#SemanaApontamentos div',
                TIME_IN: '.TimeIN,.TimeINVisualizacao'
            },

            Snippet = {
                HEADER: '<p class="qz-box-head">{0}</p>',
                HEADER_LAST_WEEK_MODE_ON: '<span class="qz-box qz-box-muted"><strong class="qz-text-primary">SEMANA ANTERIOR</strong></span>',
                HEADER_LABOR_TIME: '<span class="qz-box qz-box-muted">Total: <strong class="qz-text-primary">{0}</strong></span>',
                HEADER_TODAY_MISSING_TIME: '<span class="qz-box qz-box-muted">Faltam/Hoje: <strong class="qz-text-primary">{0}</strong></span>',
                HEADER_WEEK_MISSING_TIME: '<span class="qz-box qz-box-muted">Faltam/Semana: <strong class="qz-text-primary">{0}</strong></span>',
                HEADER_EXTRA_TIME: '<span class="qz-box qz-box-muted">Extra: <strong class="qz-text-primary">{0}</strong></span>',
                HEADER_TIME_TO_LEAVE: '<span class="qz-box qz-box-muted">Saída/Fim: <strong class="qz-text-primary">{0}</strong></span>',
                LABOR_TIME_PER_DAY: '' +
                    '<div class="qz-box qz-box-muted">' +
                        '<strong class="qz-box-content qz-text-primary">{0}</strong>' +
                    '</div>',
                LABOR_TIME_PER_SHIFT: '' +
                    '<div class="qz-box qz-box-muted">' +
                        '<strong class="qz-box-content">{0}</strong>' +
                    '</div>',
                STYLE: ''+
                    '<style>' +
                        // reset
                        'strong{font-weight:bold;}' +
                        // override
                        '.emptySlot,.FilledSlot,.LastSlot {height:inherit;padding:5px;}' +
                        '.FilledSlot span {margin:inherit!important;}' +
                        // queiroz.js classes
                        '.qz-text-primary {color:brown;}' +
                        '.qz-box {padding:7px;margin:5px 1px;border:darkgrey 1px solid;}' +
                        '.qz-box-head {float:right;padding:10px 0;}' +
                        '.qz-box-muted {background-color:lightgray;}' +
                        '.qz-box .qz-box-content {vertical-align:middle;}' +
                    '</style>'
            };

        /* PRIVATE */

        var
            _getMaxHoursPerWeekInMillis = function() {
                return Time.Hour.toMillis(Settings.MAX_HOURS_PER_WEEK);
            },
            _getMaxConsecutiveHoursPerDayInMillis = function() {
                return Time.Hour.toMillis(Settings.MAX_CONSECUTIVE_HOURS_PER_DAY);
            },
            _getMaxMinutesPerDayInMillis = function() {
                return Time.Minute.toMillis(Settings.MAX_MINUTES_PER_DAY);
            };


        var data = {
            week: {
                laborTime: {
                    millis: 0, human: '', html: ''
                },
                missingTime: {
                    millis: 0, human: '', html: ''
                },
                extraTime: {
                    millis: 0, human: '', html: ''
                },
                _computeMissingTimeInMillis: function() {
                    return _getMaxHoursPerWeekInMillis() - this.laborTime.millis;
                },
                _computeExtraTimeInMillis: function() {
                    return this.laborTime.millis - _getMaxHoursPerWeekInMillis();
                },
                buildTime: function() {
                    this.missingTime.millis = this._computeMissingTimeInMillis();
                    this.extraTime.millis = this._computeExtraTimeInMillis();
                },
                buildHumanTime: function() {
                    this.laborTime.human = Time.Millis.toHumanTime(this.laborTime.millis);
                    this.missingTime.human = Time.Millis.toHumanTime(this.missingTime.millis > 0 ? this.missingTime.millis : 0);
                    this.extraTime.human = Time.Millis.toHumanTime(this.extraTime.millis > 0 ? this.extraTime.millis : 0);
                },
                buildHtmlTime: function() {
                    this.laborTime.html = Util.textFormat(Snippet.HEADER_LABOR_TIME, [this.laborTime.human]);
                    this.missingTime.html = Util.textFormat(Snippet.HEADER_WEEK_MISSING_TIME, [this.missingTime.human]);
                    this.extraTime.html = Util.textFormat(Snippet.HEADER_EXTRA_TIME, [this.extraTime.human]);
                }
            },
            today: {
                laborTime: {
                    millis: 0
                },
                missingTime: {
                    millis: 0, human: '', html: ''
                },
                _computeMissingTimeInMillis: function() {
                    return _getMaxMinutesPerDayInMillis() - this.laborTime.millis;
                },
                buildTime: function() {
                    this.missingTime.millis = this._computeMissingTimeInMillis();
                },
                buildHumanTime: function() {
                    this.missingTime.human = Time.Millis.toHumanTime(this.missingTime.millis > 0 ? this.missingTime.millis : 0);
                },
                buildHtmlTime: function() {
                    this.missingTime.html = Util.textFormat(Snippet.HEADER_TODAY_MISSING_TIME, [this.missingTime.human]);
                }
            }
        };

        var
            _lastInDate = '',
            _getCheckpoints = function(eColumnDay) {
                return View.getAll(Selector.CHECKPOINT, eColumnDay);
            },
            _getDate = function(eColumnDay) {
                return View.get(Selector.DATE, eColumnDay).value;
            },
            _buildTimeToLeave = function() {
                if (data.week.missingTime.millis <= 0) {
                    return '';
                }
                if (data.week.missingTime.millis > _getMaxMinutesPerDayInMillis()) {
                    return '';
                }

                var htmlHumanTimeToLeave = '';
                if (_lastInDate) {
                    var timeToLeaveInMillis = _lastInDate.getTime() + data.week.missingTime.millis;
                    if (!timeToLeaveInMillis || timeToLeaveInMillis < new Date().getTime()) {
                        return '';
                    }

                    var humanTimeToLeave = Time.dateToHumanTime(new Date(timeToLeaveInMillis));
                    htmlHumanTimeToLeave = Util.textFormat(Snippet.HEADER_TIME_TO_LEAVE, [humanTimeToLeave]);
                }
                return htmlHumanTimeToLeave;
            },
            _getMissingOrExtraTime = function() {
                return data.week.missingTime.millis >= 0 ? data.week.missingTime.html : data.week.extraTime.html;
            },
            _buildHtmlHead = function(args) {
                return Util.textFormat(Snippet.HEADER, [args.join('')]);
            },
            _renderStats = function() {
                data.week.buildHumanTime();
                data.week.buildHtmlTime();
                data.today.buildHumanTime();
                data.today.buildHtmlTime();

                var
                    htmlLastWeekModeOn = Settings.LAST_WEEK_MODE ? Snippet.HEADER_LAST_WEEK_MODE_ON : '',
                    htmlMissingOrExtraTime = _getMissingOrExtraTime(),
                    htmlHumanTimeToLeave = _buildTimeToLeave();

                var
                    args = [
                        htmlLastWeekModeOn,
                        data.week.laborTime.html,
                        data.today.missingTime.html,
                        htmlMissingOrExtraTime,
                        htmlHumanTimeToLeave
                    ],
                    html = _buildHtmlHead(args);

                View.append(Selector.HEADER, html);
            },
            _buildStats = function() {
                if (Settings.LAST_WEEK_MODE === 'ON') {
                    Settings.LAST_WEEK_MODE = 'DOING';
                }

                data.week.buildTime();
                data.today.buildTime();

                if (Settings.LAST_WEEK_MODE !== 'DOING') {
                    _renderStats();
                }
            },
            _renderLaborTimePerShift = function(context, shift) {
                var humanMillis = Time.Millis.toHumanTime(shift);
                var html = Util.textFormat(Snippet.LABOR_TIME_PER_SHIFT, [humanMillis]);
                var container = document.createElement('div');
                container.innerHTML = html;
                var filledSlotOut = context.parentNode;
                filledSlotOut.parentNode.insertBefore(container, filledSlotOut.nextSibling);
                return container;
            },
            _renderLaborTimePerDay = function(eDay, millis) {
                var humanMillis = Time.Millis.toHumanTime(millis);
                eDay.innerHTML += Util.textFormat(Snippet.LABOR_TIME_PER_DAY, [humanMillis]);
            },
            _analyzeDay = function(eDay) {
                var checkpoints = _getCheckpoints(eDay);
                if (checkpoints.length) {
                    var millis = 0;
                    View.getAll(Selector.TIME_IN, eDay).forEach(function(inElement, index) {
                        var
                            inText = inElement.textContent, // 15:45
                            inDate = Time.toDate(_getDate(eDay) + " " + inText), // typeOf inDate == Date
                            outElement = checkpoints[(index * 2) + 1];

                        if (outElement && !outElement.parentElement.classList.contains('LastSlot')) { // TODO
                            var
                                outText = outElement.textContent, // 04:34
                                outDate = Time.toDate(_getDate(eDay) + " " + outText),  // typeOf outDate == Date
                                shiftInMillis = Time.Millis.diff(inDate, outDate);

                            millis += shiftInMillis;

                            if (Settings.LAST_WEEK_MODE !== 'DOING') {
                                _renderLaborTimePerShift(outElement, shiftInMillis);
                            }
                            if (Time.isToday(inDate)) {
                                data.today.laborTime.millis += shiftInMillis;
                            }
                        } else {
                            _lastInDate = inDate;
                            var diffUntilNow = Time.Millis.diff(inDate, new Date());
                            if (diffUntilNow < (_getMaxConsecutiveHoursPerDayInMillis())) {

                                var
                                    shiftInMillis = millis + diffUntilNow,
                                    element = _renderLaborTimePerShift(inElement, shiftInMillis),
                                    span = element.querySelector('strong');

                                element.style.color = 'darkgoldenrod';
                                span.textContent = '~ ' + span.textContent;
                            }
                        }
                    });
                    data.week.laborTime.millis += millis;
                    _renderLaborTimePerDay(eDay, millis);
                }
            },
            _selectDaysToAnalyze = function() {
                var
                    _selectedDays = [],
                    _foundInitialWeekday = false,
                    _fakeTime = '12:34',
                    _eDays = View.getAll(Selector.COLUMN_DAY);

                _eDays.forEach(function(eDay) {
                    var
                        _stringDay = _getDate(eDay) + " " + _fakeTime,
                        _dateDay = Time.toDate(_stringDay);

                    if (data.week.laborTime.millis === 0) { // first time
                        if (_foundInitialWeekday || (_foundInitialWeekday = _dateDay.getDay() === Settings.INITIAL_WEEKDAY)) {
                            _selectedDays.push(eDay);
                        }
                    } else { // second time
                        if (_dateDay.getDay() === Settings.INITIAL_WEEKDAY) {
                            Settings.LAST_WEEK_MODE = 'DONE';
                        } else {
                            if (Settings.LAST_WEEK_MODE === 'DOING') {
                                _selectedDays.push(eDay);
                            }
                        }
                    }
                });
                return _selectedDays;
            },
            _init = function() {
                View.append('head', Snippet.STYLE);
                var _selectedDays = _selectDaysToAnalyze();
                _selectedDays.forEach(_analyzeDay);
                _buildStats();

                if (Settings.LAST_WEEK_MODE === 'DOING') {
                    mudarSemana(1, true);
                    setTimeout(_initWithDelay, 1000);
                }
            },
            _initWithDelay = function() {
                var interval = setInterval(function() {
                    if (View.get(Selector.CHECKPOINT)) {
                        clearInterval(interval);
                        _init();
                    }
                }, Settings.TAMPERMONKEY_DELAY_MILLIS);
            };

        /* PUBLIC */

        return {
            bless: function(lastWeekMode) {
                Settings.LAST_WEEK_MODE = lastWeekMode ? 'ON' : false;
                if (Settings.LAST_WEEK_MODE === 'ON') {
                    mudarSemana(-1, true);
                    setTimeout(_initWithDelay, 1000);
                } else {
                    if (View.get(Selector.CHECKPOINT)) {
                        _init();
                    } else {
                        _initWithDelay();
                    }
                }
                return _NAME + ' ' + VERSION;
            },
            name: _NAME,
            version: VERSION
        };
    }();

    window[NAME] = Queiroz;

})(window, view, time, util);

/*!
 * Queiroz.js: autoexec.js
 * JavaScript Extension for Dimep Kairos
 * https://github.com/viniciusknob/queiroz.js
 */

Queiroz.bless();