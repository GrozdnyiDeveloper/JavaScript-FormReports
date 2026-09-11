if (typeof Project === "undefined") {
    Project = {};
}

if (typeof Project.Project === "undefined") {
    Project.Project = {};
}


Project.Project.FormEvents = {

    onCityChange: async function(context){
        await Project.Project.FormEvents.onRegionChange(context);

    },
    onRegionChange: async function (context) {
        var formContext = Project.Project.FormEvents._getFormContext(context);
        //При изменении поля Регион поле ФО в карточке обновляется значением ФО выбранного региона.
        var newValue = null;
        var city = Project.Project.FormEvents._getAttributeValue("Project_cityid", formContext);
        debugger
        if (city) {
         
            //  var retrievedCity = XrmServiceToolkit.Soap.Retrieve("Project_city", city[0].id, ["Project_region"]);
            var retrievedCity = await Project.Project.FormEvents._getFields("Project_city", city[0].id.replace(/[{}]/g, ''), "?$select=_Project_region_value");
            debugger;
            var region = retrievedCity["_Project_region_value"];
            if (region) {
                debugger;
                regionValueLookup = Project.Project.FormEvents._createLookup(retrievedCity["_Project_region_value"],
                    retrievedCity["_Project_region_value@OData.Community.Display.V1.FormattedValue"],
                    retrievedCity["_Project_region_value@Microsoft.Dynamics.CRM.lookuplogicalname"]);
                Project.Project.FormEvents._updateField(context,"Project_salesregionid", regionValueLookup);
            }
        }

        var regionValue = Project.Project.FormEvents._getAttributeValue("Project_salesregionid", formContext);
        if (regionValue) {
          
           // var region = XrmServiceToolkit.Soap.Retrieve("Project_salesregion", regionValue[0].id, ["Project_territoryid"]);
           var region = await Project.Project.FormEvents._getFields("Project_salesregion", regionValue[0].id.replace(/[{}]/g, ''), "?$select=_Project_territoryid_value");
            var territory = region["_Project_territoryid_value"];
            if (territory) {
                newValue = Project.Project.FormEvents._createLookup(region["_Project_territoryid_value"],
                region["_Project_territoryid_value@OData.Community.Display.V1.FormattedValue"],
                region["_Project_territoryid_value@Microsoft.Dynamics.CRM.lookuplogicalname"]);
            }
        }
        Project.Project.FormEvents._updateField(context,"Project_territoryid", newValue);
    },

    "Statuses": { Active: 1, ProjectEquipment: 279750001, CompetitorsEquipment: 279750002, },

    checkUserForRoles: async function (context) {
        var formContext = Project.Project.FormEvents._getFormContext(context);
        var projectAdmin = await Project.Project.FormEvents._callActionForRoleCheck('Администратор проектов');
        var sysAdmin = await Project.Project.FormEvents._callActionForRoleCheck('Системный администратор');
        debugger;
        if (projectAdmin != null && sysAdmin != null & (projectAdmin.res == true || sysAdmin.res == true)) {
            debugger;
            formContext.getAttribute("Project_cityid") != null ? formContext.getAttribute("Project_cityid").setRequiredLevel("none") : null;
            formContext.getAttribute("Project_clientid") != null ? formContext.getAttribute("Project_clientid").setRequiredLevel("none") : null;
            formContext.getAttribute("Project_estimatedvalue") != null ? formContext.getAttribute("Project_estimatedvalue").setRequiredLevel("none") : null;
            formContext.getAttribute("Project_industry") != null ? formContext.getAttribute("Project_industry").setRequiredLevel("none") : null;
            formContext.getAttribute("Project_initiatorproject") != null ? formContext.getAttribute("Project_initiatorproject").setRequiredLevel("none") : null;
            formContext.getAttribute("Project_partner_branch") != null ? formContext.getAttribute("Project_partner_branch").setRequiredLevel("none") : null;
            formContext.getAttribute("Project_salesregionid") != null ? formContext.getAttribute("Project_salesregionid").setRequiredLevel("none") : null;
            formContext.getAttribute("Project_sourceproject") != null ? formContext.getAttribute("Project_sourceproject").setRequiredLevel("none") : null;
            formContext.getAttribute("Project_shipment_start_plan_date") != null ? formContext.getAttribute("Project_shipment_start_plan_date").setRequiredLevel("none") : null;
            formContext.getAttribute("Project_shipment_end_plan_date") != null ? formContext.getAttribute("Project_shipment_end_plan_date").setRequiredLevel("none") : null;
        }
        debugger;

    },

    _callActionForRoleCheck: async function (roleName) {

        var Id = Xrm.Utility.getGlobalContext().userSettings.userId.replace('{', '').replace('}', '');

        var target = {};
        target.entityType = "systemuser";
        target.id = Id;

        try {
            let entity = target;
            objActionCallRequest = {
                //указываем, что действие будет запущено на сущности entity( строка 16, объявлена entity)
                entity: entity,
                roleName: roleName,
                getMetadata: function () {
                    objMetadata = {
                        boundParameter: "entity", // Т.к. Вызываем на сущности, указываем entity. Если бы было глобальным, то null
                        parameterTypes: {
                            //указываем тип аргументов
                            "entity": {
                                typeName: "mscrm.systemuser",
                                structuralProperty: 5
                            },
                            "roleName": {
                                typeName: "Edm.String",
                                structuralProperty: 1
                            }
                        },
                        operationName: "Project_ChechIfUserHasRoles",
                        operationType: 0    // 0 is for Calling Action using Xrm.WebApi.execute
                    };
                    return objMetadata;
                }
            };
            //вызываем действие и получаем ответ
            let data = await Xrm.WebApi.online.execute(objActionCallRequest);

            var res = await data.json();
            return res;
        }
        catch (ex) {
            console.log(ex.message);
        }
    },

    errorInterceptor: function () {
        new CrmErrorInterceptor().intercept();
    },

    onLoad: function (context) {
        debugger;
        var formContext = Project.Project.FormEvents._getFormContext(context);
        Project.Project.FormEvents.onStatusChange(context);
        var typecodeAttr = formContext.getAttribute("statuscode");
        typecodeAttr.addOnChange(Project.Project.FormEvents.onStatusChange);

        formContext.data.entity.addOnSave(Project.Project.FormEvents.onSave);

        var partnerUnknown = formContext.getAttribute("Project_partner_unknown");
        if(partnerUnknown){
            partnerUnknown.addOnChange(Project.Project.FormEvents.onUnknownPartnerChange);
        }
        Project.Project.FormEvents.onUnknownPartnerChange(context);

        var industryAttr = formContext.getAttribute("Project_industry");
        if (industryAttr)
            industryAttr.addOnChange(Project.Project.FormEvents.onIndustryChange);

        var rsStatus = formContext.getAttribute("Project_export");
        if (rsStatus && rsStatus.getValue() == true) {
            var partnerName = formContext.getAttribute("Project_accountid").getValue();
            if (partnerName != null && (partnerName[0].name.indexOf("Русский Свет") >= 0))
                formContext.ui.setFormNotification("Проект находится в очереди на отправку (интеграция)", "WARNING", "1");
        }
    },

    /** Фунция отправки контекста в веб ресурс */
    sendContextToHTML: function (executionContext) {
        var formContext = Project.Project.FormEvents._getFormContext(executionContext);
        // Находим веб ресурс на форме
        var wrControl = formContext.getControl("WebResource_gpr_map");
        if (wrControl) {
            try {
                // Метод для UCI: Вызываем метод в веб ресурсе для принятия контекста
                wrControl.getContentWindow().then(
                    function (contentWindow) {
                        contentWindow.Project.LoyalityGraphLogic.init(formContext);
                    }
                )
            } catch {
                // Метод для Legacy: Сохраняем контекст в контейнере окна
                window.top.formContext = formContext;
            }
        }
    },

    checkShipmentEndPlanDateRequired: function (context) {
        var formContext = Project.Project.FormEvents._getFormContext(context);
        var shipmentEndPlanDateAttr = formContext.getAttribute("Project_shipment_end_plan_date");
        if (!shipmentEndPlanDateAttr)
            return;

        var ownerId = formContext.getAttribute("ownerid").getValue()[0].id.replace(/\{|\}/g, '').toUpperCase();
        var body = {
            "OwnerId": {
                "@odata.type": "Microsoft.Dynamics.CRM.systemuser",
                "systemuserid": ownerId
            }
        };
        var customer = formContext.getAttribute("Project_clientid").getValue();
        if (customer) {
            let customerId = customer[0].id.replace(/\{|\}/g, '').toUpperCase();
            body["CustomerId"] = {
                "@odata.type": "Microsoft.Dynamics.CRM.account",
                "accountid": customerId
            };
        }

        fetch(Xrm.Utility.getGlobalContext().getClientUrl() + `/api/data/v9.0/Project_ShipmentEndDateRequiredInProject`,
            {
                method: 'POST',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then((response) => {
                if (response.ok) {
                    return response.json();
                }
            })
            .then((result) => {
                let isRequired = result.Required;
                if (isRequired)
                    shipmentEndPlanDateAttr.setRequiredLevel("required");
            });
    },

    controlReadabilityTopAndOwnProjectAttributes: function (context) {
        const adminsTeamCode = "TOP_PROJECTS";


        let roles = Xrm.Utility.getGlobalContext().userSettings.roles;
        if (roles) {
            roles.forEach(x => {
                if (x.name === "Системный администратор") {
                    Project.Project.FormEvents.enableTopAndOwnProjectAttributes(formContext);
                    return;
                }
            });
        }


        var formContext = Project.Project.FormEvents._getFormContext(context);
        Project.Project.FormEvents.disableTopAndOwnProjectAttributes(formContext);

        let userId = Xrm.Utility.getGlobalContext().userSettings.userId.replace(/\{|\}/g, '').toUpperCase();
        let ownerId = formContext.getAttribute("ownerid").getValue()[0].id.replace(/\{|\}/g, '').toUpperCase();
        if (userId == ownerId) {
            let topProject = formContext.getAttribute("Project_top_project_bit").getValue();
            if (!topProject) {
                Project.Project.FormEvents.enableTopProjectAttribute(formContext);
            }

            let ownProject = formContext.getAttribute("Project_own_projectbit").getValue();
            if (!ownProject) {
                Project.Project.FormEvents.enableOwnProjectAttribute(formContext);
            }
        }

        Xrm.WebApi.online.retrieveMultipleRecords("team", `?$expand=teammembership_association($select=systemuserid)&$filter=Project_code eq '${adminsTeamCode}'`).then(
            function success(results) {
                for (var i = 0; i < results.entities.length; i++) {
                    var teammembership_association_NextLink = results.entities[i]["teammembership_association@odata.nextLink"];

                    var req = new XMLHttpRequest();
                    req.open("GET", teammembership_association_NextLink, false);
                    req.setRequestHeader("OData-MaxVersion", "4.0");
                    req.setRequestHeader("OData-Version", "4.0");
                    req.setRequestHeader("Accept", "application/json");
                    req.setRequestHeader("Content-Type", "application/json; charset=utf-8");
                    req.setRequestHeader("Prefer", "odata.include-annotations=\"*\"");
                    req.onreadystatechange = function () {
                        if (this.readyState === 4) {
                            if (this.status === 200) {
                                var results = JSON.parse(this.response);
                                for (var i = 0; i < results.value.length; i++) {
                                    let systemuserid = results.value[i]["systemuserid"].toUpperCase();
                                    if (systemuserid == userId) {
                                        Project.Project.FormEvents.enableTopProjectAttribute(formContext);
                                        Project.Project.FormEvents.enableOwnProjectAttribute(formContext);
                                        return;
                                    }
                                }
                            } else {
                                console.log(this.statusText);
                            }
                        }
                    };
                    req.send();
                }
            },
            function (error) {
                console.log(error.message);
            }
        );
    },

    disableTopAndOwnProjectAttributes: function (formContext) {
        var ownProjectControl = formContext.getControl("header_Project_own_projectbit");
        ownProjectControl && ownProjectControl.setDisabled(true);

        var topProjectControl = formContext.getControl("header_Project_top_project_bit");
        topProjectControl && topProjectControl.setDisabled(true);
    },

    enableTopProjectAttribute: function (formContext) {
        var topProjectControl = formContext.getControl("header_Project_top_project_bit");
        topProjectControl && topProjectControl.setDisabled(false);
    },

    enableOwnProjectAttribute: function (formContext) {
        var ownProjectControl = formContext.getControl("header_Project_own_projectbit");
        ownProjectControl && ownProjectControl.setDisabled(false);
    },

    onUnknownPartnerChange: function (context) {
        debugger;
        var formContext = Project.Project.FormEvents._getFormContext(context);
        //если не установлена галка "партнер не определен", то поле "партнер по совм.проекту" должно быть обязательным для заполнения.
        var isPartnerUnknown = formContext.getAttribute("Project_partner_unknown").getValue();
        if (!isPartnerUnknown) {
            formContext.getAttribute("Project_accountid").setRequiredLevel("required");
        }
        else {
            formContext.getAttribute("Project_accountid").setRequiredLevel("none");
        }
    },


//По сути, не используется 
    onIndustryChange: function (context) {
        debugger;
        var formContext = Project.Project.FormEvents._getFormContext(context);
        var industryStatus = formContext.getAttribute("Project_industry").getValue();
        if (industryStatus != 279750012) {
            formContext.ui.controls.get("Project_other_text").setVisible(false);
        }
        else {
            formContext.ui.controls.get("Project_other_text").setVisible(true);
        }
    },

    onStatusChange: function (context) {
        debugger;
        var formContext = Project.Project.FormEvents._getFormContext(context);
        var status = formContext.getAttribute("statuscode").getValue();
        if (status == Project.Project.FormEvents.Statuses.CompetitorsEquipment) {
            formContext.ui.tabs.get("common_tab").sections.get("competitor_section_7").setVisible(true);
        }
        else {
            formContext.ui.tabs.get("common_tab").sections.get("competitor_section_7").setVisible(false);
        }

    },

    onSave: function (context) {
        debugger;
        var formContext = Project.Project.FormEvents._getFormContext(context);
        //Сделать сообщением "Задайте партнёра по совместному проекту, либо установите признак "Партнёр не определён".".
        var isPartnerUnknown = formContext.getAttribute("Project_partner_unknown").getValue();
        var partnerLookup = formContext.getAttribute("Project_accountid").getValue();
        if (isPartnerUnknown && partnerLookup != null) {
            Project.Project.FormEvents._alert("Внимание!", "Установлен признак \"Партнёр не определён\", но при этом указан партнёр по совместному проекту. Необходимо исправить.");
            context.getEventArgs().preventDefault();
            formContext.getControl("Project_accountid").setFocus(true);
        }

        if (!isPartnerUnknown && partnerLookup == null) {
            Project.Project.FormEvents._alert("Внимание!", "Задайте партнёра по совместному проекту, либо установите признак \"Партнёр не определён\"");
            context.getEventArgs().preventDefault();
            formContext.getControl("Project_accountid").setFocus(true);
        }
    },

    sendSpecifications: function (context) {
        debugger;
        var formContext = Project.Project.FormEvents._getFormContext(context);
        formContext.getAttribute("Project_export").setValue(true);
        formContext.ui.setFormNotification("Проект находится в очереди на отправку (интеграция)", "WARNING", "1");
        formContext.data.entity.save();
    },
    checkProjectName: function (context) {
        debugger;
        var formContext = Project.Project.FormEvents._getFormContext(context);
        var name = formContext.getAttribute("Project_name").getValue();
        if (name.match(/;/) != null) {
            Project.Project.FormEvents._alert("Внимание!", 'Название проекта не должно содержать символ ";". Пожалуйста, отредактируйте название проекта.');
            context.getEventArgs().preventDefault();
        }
        debugger;
    },
    _getFormContext: function (execContext) {

        try {
            var contex = execContext.getFormContext()
            return contex;
        }
        catch (ex) {

            return execContext;
        }
    },
    _getAttributeValue: function (fieldname, formContext) {
        var attr = formContext.getAttribute(fieldname);
        if (attr) {
            return attr.getValue();
        }
        return null;
    },
    _createLookup: function (id, name, entityType) {
        var value = new Array();
        value[0] = new Object();
        value[0].id = id;
        value[0].name = name;
        value[0].entityType = entityType;
        return value;
    },
    _compareGuids: function (guid1, guid2) {
        return !!(guid1 && guid2) && guid1.replace(/[{}]/g, "").toLowerCase() == guid2.replace(/[{}]/g, "").toLowerCase();
    },
    _updateField: function (context, fieldName, value) {
        var formContext = Project.Project.FormEvents._getFormContext(context);
        var attr = formContext.getAttribute(fieldName);
        if (attr) {
            if (attr.getValue() != value) {
                if (attr.getAttributeType() == 'lookup' && attr.getValue() != null && value != null && Project.Project.FormEvents._compareGuids(attr.getValue()[0].id, value[0].id)) {
                    return;
                }
                attr.setValue(value);
                attr.setSubmitMode("always");
                attr.fireOnChange();
            }
        }
    },
    _alert: function (title, message) {
        var alertStrings = { confirmButtonLabel: "OK", text: message, title: title };
        var alertOptions = { height: 160, width: 520 };
        Xrm.Navigation.openAlertDialog(alertStrings, alertOptions).then(
            function (success) {
                console.log("Alert dialog closed");
            },
            function (error) {
                console.log(error.message);
            }
        )
    },
    _getFields: async function (entityName, entityId, query) {
        var entity = await Xrm.WebApi.retrieveRecord(entityName, entityId, query);
        return entity;
    }
}
Project.Project.FormEvents.Ribbon = {
    buttonSendSpecificationClick: function (context) {
        Project.Project.FormEvents.sendSpecifications(context);
    }

};
