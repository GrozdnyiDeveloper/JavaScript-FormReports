var Project = Project || {};

Project.LoyalityGraphLogic = {
    /** Основная функция отрисовки карты ГПР */
    init: async function (receivedContext) {
        var formContext;
        // Проверяем наличие контекста с формы
        if (receivedContext) {
            // Для UCI: получаем контекст, переданный с формы
            formContext = receivedContext;
        } else {
            // Для Legacy: получаем контекст из контейнера окна
            formContext = window.top.formContext;
            window.top.formContext = null;
        }

        // Выходим из метода если не получили контекст (ещё не передался)
        if (!formContext) return;
        // Получаем ID текущей записи
        var entityId = formContext.data.entity.getId().replace(/[{}]/g, '');
        if (!entityId) {
            // Выводим ошибку на экран
            document.getElementById('main').style.display = 'none';
            document.getElementById('errorText').style.display = 'block';
            document.getElementById('errorText').innerText = "Ошибка: Не удалось получить Id записи.";
            
            return;
        }
        // Получаем данные для построения карты из CRM
        var result = await Project.LoyalityGraphLogic.getLoyalityGraphData(entityId);
        // Если данные не были получены
        if (!result){
            // Выводим ошибку на экран
            document.getElementById('main').style.display = 'none';
            document.getElementById('errorText').style.display = 'block';
            document.getElementById('errorText').innerText = "Ошибка: При формировании графика не были получены данные для его построения.";
            return;
        } 
        // Если действие вернуло ошибку
        if (result.ErrorMessage){
            // Выводим ошибку на экран
            document.getElementById('main').style.display = 'none';
            document.getElementById('errorText').style.display = 'block';
            document.getElementById('errorText').innerText = "Ошибка: При формировании графика произошла ошибка: " + result.ErrorMessage;
            return;
        }  
        //Преобразовываем данные под JSON формат и возвращаем их
        var data = JSON.parse(result.ResultJson);
        // Получаем значения Лояльности и Влияния через метаданные полей
        data = await Project.LoyalityGraphLogic.convertDataForGraph(data);

        // Регистрация плагина для подписей
        Chart.register(ChartDataLabels);

        // Получаем контекст и формируем набор данных (точки) для карты
        var context = document.getElementById('chart').getContext('2d');
        var datasets = data.map(item => ({
            label: item.Title, // Наименование точки = Должность
            data: [{ x: item.Loyality, y: item.Impact }], // Координаты x = Лояльность, y = Влияние
            pointBackgroundColor: Project.LoyalityGraphLogic.getColorForLoyalty(item.Loyality), // Через функцию получаем цвет точки в зависимости от значения Лояльности
            pointBorderColor: '#000',
            pointRadius: 5,
            showLine: false
        }));

        // Формируем массив для стрелок
        var annotations = {};
        // Добавляем стрелку, которая будет располагаться вдоль оси y графика
        annotations['y-axis'] = {
            type: 'line',
            xScaleID: 'x', yScaleID: 'y',
            xMin: 0, xMax: 0,
            yMin: 0, yMax: 5,
            borderColor: '#000', borderWidth: 1,
            arrowHeads: { 
                start: { display: false }, 
                end: { display: true, size: 4, fill: true } 
            }
        };
        // Добавляем стрелку, которая будет располагаться вдоль оси x графика
        annotations['x-axis'] = {
            type: 'line',
            xScaleID: 'x', yScaleID: 'y',
            xMin: -2.5, xMax: 2.5,
            yMin: 0, yMax: 0,
            borderColor: '#000', borderWidth: 1,
            arrowHeads: { 
                start: { display: true, size: 4, fill: true }, 
                end: { display: true, size: 4, fill: true } 
            }
        };

        // Формируем указатели влияний между точками в виде стрелок
        data.forEach(startPoint => {
            // Для этого для каждой записи проверяем поля "На кого влияет", "На кого влияет (доп.)", "На кого влияет (доп. 2)"
            ["Affectedby", "Affectedby2", "Affectedby3"].forEach(currentAffected => {
                // Пропускаем проверку для данного поля если оно пусто
                if (!startPoint[currentAffected])
                    return;
                // Производим поиск точки по ID на которую влияет наша текущая точка
                var endPoint = data.find(point => point.Id === startPoint[currentAffected].Id);
                // Пропускаем проверку для данного поля если не удалось найти точку
                if (!endPoint) 
                    return;
                // Вызываем функцию для получения вида стрелки в зависимости от поля
                var { borderWidth, borderDash } = Project.LoyalityGraphLogic.getLineStyle(currentAffected);
                // Добавляем стрелку от текущей точки до точки на которую она влияет
                annotations[`conn-${startPoint.Id}-${endPoint.Id}`] = {
                    type: 'line',
                    xScaleID: 'x', yScaleID: 'y',
                    xMin: startPoint.Loyality, xMax: endPoint.Loyality,
                    yMin: startPoint.Impact, yMax: endPoint.Impact,
                    borderColor: '#333', borderWidth, borderDash,
                    arrowHeads: { 
                        start: { display: false }, 
                        end: { display: true, size: 4, fill: true } 
                    }
                };
            });
        });

        // Формируем объект самого графика
        new Chart(context, {
            type: 'scatter',
            data: { datasets }, // Загружаем данные точек
            options: {
                responsive: false,
                scales: {
                    // Задаём данные для оси x
                    x: {
                        type: 'linear', min: -2.5, max: 2.5, offset: false,
                        grid: { drawOnChartArea: true, drawTicks: true },
                        ticks: { stepSize: 0.5, callback: v => v >= -2 && v <= 2  ? `[${v}]` : null },
                        title: { display: true, text: 'ЛОЯЛЬНОСТЬ', font: { size: 14 } }
                    },
                    // Задаём данные для оси y
                    y: {
                        type: 'linear', min: -0.5, max: 4.5, offset: false,
                        grid: { drawOnChartArea: true, drawTicks: true },
                        ticks: { stepSize: 0.5, callback: v => v >= 0 && v <= 4 ? `(${v})` : null },
                        title: { display: true, text: 'СИЛА ВЛИЯНИЯ', font: { size: 14 } }
                    }
                },
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        color: '#000', anchor: 'end', align: 'top', formatter: (value, ctx) => ctx.dataset.label
                    },
                    annotation: { annotations } // Загружаем данные указателей
                }
            }
        });

        document.getElementById('legend').innerText = "Для оценки ГПР и построения успешной стратегии\n" +
            "продаж необходимо знать, кто участвует в процессе\n" +
            "принятия решения, а также оценить данных участников\n" +
            "по параметрам.\n\n" +

            "А. Сила влияния каждого участника на необходимое нам\n" +
            "решение.\n" +
            "В. Лояльность каждого участникак нам и нашему\n" +
            "предложению.\n" +
            "С. Коммуникации; кто и накого может повлиять в ГПР.\n" +
            "D. Мотивы: что влияет на принятие решения каждым\n" +
            "участником ГПР.\n";
    },

    /** Функция получения данных участников карты ГПР */
    getLoyalityGraphData: async function (entityId) {
        // Вызываем метод запуски действия Project_GetGraphDataForProject для текущей записи
        var response = await Project.LoyalityGraphLogic.runActionByNameWithReturn("Project_GetGraphDataForProject", entityId, "Project_project");
        // Получаем и возвращаем результат
        return await response.json();
    }, 

    /** Метод запуска действия определённой сущности без параметров */
    runActionByNameWithReturn: async function (actionName, entityId, entityName) {
        // Формируем тело запроса к действию
        var actionData = new Project.LoyalityGraphLogic.processAction(entityName, entityId, actionName);

        // Получаем ответ
        var response = await Xrm.WebApi.online.execute(actionData);

        // Возвращаем ошибку если запрос не коррректный 
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        // Возвращаем ответ
        return response;
    },

    /** Модель данных для запуска действия */
    processAction: function (entityName, entityId, actionName) {
        this.entity = { entityType: entityName, id: entityId };

        this.getMetadata = function () {
            var metadata = {
                boundParameter: "entity",
                parameterTypes: {
                    "entity": {
                        "typeName": "mscrm." + entityName,
                        "structuralProperty": 5
                    }
                },
                operationType: 0,
                operationName: actionName
            };

            return metadata;
        };
    },

    /** Функция получения значений Лояльности и Влияния через метаданные полей */
    convertDataForGraph: async function (data) {
        // Получаем список параметров через метаданные для полей Лояльности и Влияния
        var loyalityOptions = await Project.LoyalityGraphLogic.getOptionSetMetadata("Project_loyalty");
        var impactOptions = await Project.LoyalityGraphLogic.getOptionSetMetadata("Project_impact");
        // Для каждой записи точки
        for (var i = 0; i < data.length; i++) {
            // Находим соотвтетсвующий параметр из списка параметров Лояльности
            var loyalityOption = loyalityOptions.find((option) => option.attributevalue == data[i].Loyalty);
            // Если параметр был найден
            if (loyalityOption) 
                // Заменяем его фактическое значение на отображаемое
                data[i].Loyality = parseFloat(loyalityOption.value.replace(",", "."));

            // Находим соотвтетсвующий параметр из списка параметров Влияния
            var impactOption = impactOptions.find((option) => option.attributevalue == data[i].Impact);
            // Если параметр был найден
            if (impactOption) 
                // Заменяем его фактическое значение на отображаемое
                data[i].Impact = parseFloat(impactOption.value.replace(",", "."));
        }
        return data
    },

    /** Функция получения списка параметров из метаданных */
    getOptionSetMetadata: async function (attributeName) {
        // Формируем fetch запрос на получение набора параметров, содержащихся в переданном поле
        var optionSetFetch = `<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='false'>
            <entity name='stringmap' >
                <attribute name='attributevalue' />
                <attribute name='value' />
                <filter type='and' >
                    <condition attribute='attributename' operator='eq' value= '${attributeName}' />
                </filter>
            </entity>
        </fetch>`;
        // Отправляем запрос и возвращаем полученный результат
        var result = await Xrm.WebApi.retrieveMultipleRecords("stringmap", "?fetchXml=" + encodeURIComponent(optionSetFetch));
        return result.entities;
    },

    /** Функция для определения цвета по значению лояльности */ 
    getColorForLoyalty: function (x) {
        if (x >= -2 && x < -1) return '#800000';        // темно-бордовый
        if (x >= -1 && x < -0.5) return '#8B0000';      // бордовый
        if (x === -0.5) return '#FF0000';               // красный
        if (x === 0) return '#FFFF00';                  // желтый
        if (x === 0.5) return '#90EE90';                // светло-зеленый
        if (x === 1) return '#008000';                  // зеленый
        if (x >= 1.5 && x <= 2) return '#006400';       // темно-зеленый
        return '#999999';                               // серый по умолчанию
    },

    /** Функция для определения стиля стрелки в зависимости от поля влияния */ 
    getLineStyle: function (style) {
        switch (style) {
            case 'Affectedby': return { borderWidth: 2, borderDash: [] }; // Сплошная линия для поля "На кого влияет"
            case 'Affectedby2': return { borderWidth: 1, borderDash: [6, 2, 2, 2] }; // Пунктирная линия для поля "На кого влияет (доп.)"
            case 'Affectedby3': return { borderWidth: 1, borderDash: [4, 4] }; // Пунктирная линия с разделителями для поля "На кого влияет (доп. 2)"
        }
    },
}