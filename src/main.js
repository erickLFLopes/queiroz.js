
/*!
 * Queiroz.js 2.6.6: main.js
 * JavaScript Extension for Dimep Kairos
 */

(function(window, View, Time, Util) {

    /* Constants */

    var NAME = 'Queiroz';


    /* Module Definition */

    var Queiroz = function() {

        /* CONSTANTS */

        var
            _NAME = 'Queiroz.js',
            VERSION = '2.6.6',

            Settings = {
                INITIAL_WEEKDAY: Time.Weekday.MONDAY,
                LAST_WEEK_MODE: false, // false, ON, DOING, DONE
                MAX_HOURS_PER_DAY: 6,
                MAX_HOURS_PER_WEEK: 44,
                NORMAL_MINUTES_PER_DAY: (8 * 60) + 48,
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
                HEADER: '<p class="floatRight" style="padding: 10px; background-color: lightgray;">{0}{1}{2}{3}</p>',
                HEADER_LAST_WEEK_MODE_ON: '<span class="bold" style="color: green;">SEMANA ANTERIOR</span>  |  ',
                HEADER_LABOR_TIME: 'Total: <span class="bold" style="color: brown;">{0}</span>',
                HEADER_MISSING_TIME: '  |  Faltam: <span class="bold" style="color: brown;">{0}</span>',
                HEADER_EXTRA_TIME: '  |  Extra: <span class="bold" style="color: brown;">{0}</span>',
                HEADER_TIME_TO_LEAVE: '  |  Saída/Fim: <span class="bold" style="color: brown;">{0}</span>',
                LABOR_TIME_PER_DAY: '' +
                    '<div class="FilledSlot" style="background-color: lightgray; padding-top: 5px; margin-bottom: 10px;">' +
                        '<span class="bold" style="margin-left: 6px; color: brown; vertical-align: middle;">= {0}</span>' +
                    '</div>',
                LABOR_TIME_PER_SHIFT: '' +
                    '<div class="FilledSlot" style="background-color: lightgray; padding-top: 5px; margin-bottom: 10px;">' +
                        '<span class="bold" style="margin-left: 6px; vertical-align: middle;">{0}</span>' +
                    '</div>'
            };

        /* PRIVATE */

        var
            _larborTimeInMillis = 0,
            _lastIn = '',
            _computeMaxHoursPerWeekInMillis = function() {
                return Settings.MAX_HOURS_PER_WEEK * Time.Millis.IN_HOUR;
            },
            _computeMissingTimeInMillis = function() {
                return _computeMaxHoursPerWeekInMillis() - _larborTimeInMillis;
            },
            _computeExtraTimeInMillis = function() {
                return _larborTimeInMillis - _computeMaxHoursPerWeekInMillis();
            },
            _getCheckpoints = function(eColumnDay) {
                return View.getAll(Selector.CHECKPOINT, eColumnDay);
            },
            _getDate = function(eColumnDay) {
                return View.get(Selector.DATE, eColumnDay).value;
            },
            _getMaxHoursPerDayInMillis = function() {
                return Time.Hour.toMillis(Settings.MAX_HOURS_PER_DAY);
            },
            _getNormalMinutesPerDayInMillis = function() {
                return Time.Minute.toMillis(Settings.NORMAL_MINUTES_PER_DAY);
            },
            _buildTimeToLeave = function(missingTimeInMillis) {
                if (missingTimeInMillis <= 0) {
                    return '';
                }
                if (missingTimeInMillis > _getNormalMinutesPerDayInMillis()) {
                    return '';
                }

                var htmlHumanTimeToLeave = '';
                if (_lastIn) {
                    var timeToLeaveInMillis = _lastIn.getTime() + missingTimeInMillis;
                    if (!timeToLeaveInMillis || timeToLeaveInMillis < new Date().getTime()) {
                        return '';
                    }

                    var humanTimeToLeave = Time.dateToHumanTime(new Date(timeToLeaveInMillis));
                    htmlHumanTimeToLeave = Util.textFormat(Snippet.HEADER_TIME_TO_LEAVE, [humanTimeToLeave]);
                }
                return htmlHumanTimeToLeave;
            },
            _renderStats = function(missingTimeInMillis, humanLaborTime, humanMissingTime, humanExtraTime) {
                var
                    htmlLastWeekModeOn = Settings.LAST_WEEK_MODE ? Snippet.HEADER_LAST_WEEK_MODE_ON : '',
                    htmlHumanLaborTime = Util.textFormat(Snippet.HEADER_LABOR_TIME, [humanLaborTime]),
                    htmlHumanMissingTime = Util.textFormat(Snippet.HEADER_MISSING_TIME, [humanMissingTime]),
                    htmlHumanExtraTime = Util.textFormat(Snippet.HEADER_EXTRA_TIME, [humanExtraTime]),
                    htmlHumanTimeToLeave = _buildTimeToLeave(missingTimeInMillis);

                var
                    args = [
                        htmlLastWeekModeOn,
                        htmlHumanLaborTime,
                        (missingTimeInMillis >= 0 ? htmlHumanMissingTime : htmlHumanExtraTime),
                        htmlHumanTimeToLeave
                    ],
                    html = Util.textFormat(Snippet.HEADER, args);

                View.append(Selector.HEADER, html);
            },
            _buildStats = function() {
                if (Settings.LAST_WEEK_MODE === 'ON') {
                    Settings.LAST_WEEK_MODE = 'DOING';
                }

                var
                    missingTimeInMillis = _computeMissingTimeInMillis(),
                    extraTimeInMillis = _computeExtraTimeInMillis(),
                    humanLaborTime = Time.Millis.toHumanTime(_larborTimeInMillis),
                    humanMissingTime = Time.Millis.toHumanTime(missingTimeInMillis > 0 ? missingTimeInMillis : 0),
                    humanExtraTime = Time.Millis.toHumanTime(extraTimeInMillis > 0 ? extraTimeInMillis : 0);


                if (Settings.LAST_WEEK_MODE !== 'DOING') {
                    _renderStats(missingTimeInMillis, humanLaborTime, humanMissingTime, humanExtraTime);
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
            _renderLaborTime = function(eDay, millis) {
                var humanMillis = Time.Millis.toHumanTime(millis);
                eDay.innerHTML += Util.textFormat(Snippet.LABOR_TIME_PER_DAY, [humanMillis]);
            },
            _analyzeDay = function(eDay) {
                var checkpoints = _getCheckpoints(eDay);
                if (checkpoints.length) {
                    var millis = 0;

                    View.getAll(Selector.TIME_IN, eDay).forEach(function(eIn, index) {
                        var
                            timeIn = eIn.textContent, // 15:45
                            enter = Time.toDate(_getDate(eDay) + " " + timeIn),
                            eOut = checkpoints[(index * 2) + 1];

                        if (eOut && !eOut.parentElement.classList.contains('LastSlot')) { // TODO
                            var
                                timeOut = eOut.textContent, // 04:34
                                exit = Time.toDate(_getDate(eDay) + " " + timeOut),
                                shift = Time.Millis.diff(enter, exit);

                            millis += shift;

                            if (Settings.LAST_WEEK_MODE !== 'DOING') {
                                _renderLaborTimePerShift(eOut, shift);
                            }
                        } else {
                            _lastIn = enter;
                            var diffUntilNow = Time.Millis.diff(enter, new Date());
                            if (diffUntilNow < (_getMaxHoursPerDayInMillis())) {
                                var
                                    shift = millis + diffUntilNow,
                                    element = _renderLaborTimePerShift(eIn, shift),
                                    span = element.querySelector('span');
                                element.style.color = 'darkgoldenrod';
                                span.textContent = '~ ' + span.textContent;
                            }
                        }
                    });
                    _renderLaborTime(eDay, millis);
                    _larborTimeInMillis += millis;
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

                    if (_larborTimeInMillis === 0) { // first time
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
            _resetControls = function() {
                _larborTimeInMillis = 0;
                _lastIn = '';
            },
            _init = function() {
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