var Project = Project || {};


Project.ReportView = {
    getDataParam : function (paramName) {
        var vals = new Array();
        if (location.search != "") {
            vals = location.search.substr(1).split("&");
            for (var i in vals) {
                vals[i] = vals[i].replace(/\+/g, " ").split("=");
            }

            //look for the parameter named 'data'
            var found = false;
            for (var i in vals) {
                if (vals[i][0].toLowerCase() == paramName) {
                    return vals[i][1];
                    break;
                }
            }
            return null;
        }
    },

    fetchProxyHost : async function  () {

        var proxyPath = "";
        var fetchData = {
            Project_name: "REPORTSERVER_URL"
        };
        var fetchXml = [
            "<fetch top='50'>",
            "  <entity name='Project_settings'>",
            "    <attribute name='Project_value' />",
            "    <filter>",
            "      <condition attribute='Project_name' operator='eq' value='", fetchData.Project_name/*WS_CRMPROXY*/, "'/>",
            "    </filter>",
            "  </entity>",
            "</fetch>",
        ].join("");
        proxyPath = await Xrm.WebApi.retrieveMultipleRecords("Project_settings", "?fetchXml=" + encodeURIComponent(fetchXml))
            .then(function success(result) {
                if (result.entities.length > 0) {
                    return result.entities[0].Project_value;
                }
            });
        return proxyPath;
    },

    fetchCommercialConditionsId: async function (specpriceId) {

        var commercialConditionsId = await Xrm.WebApi.retrieveRecord("Project_specprice", specpriceId, "?$select=Project_specpriceid,_Project_commercial_conditionsid_value")
            .then(function success(result) {
                return result._Project_commercial_conditionsid_value;
            });

        return commercialConditionsId;
    },

    getHtmlDataFromReport : async function () {

        var entityId = decodeURI(Project.ReportView.getDataParam("id")).replace("{", "").replace("}", "");
        var entityName = decodeURI(Project.ReportView.getDataParam("typename")).replace("{", "").replace("}", "");
        var reportName = Project.ReportView.getDataParam("data");
        var SSRSProxyPath = await Project.ReportView.fetchProxyHost();

        if (entityName == "Project_specprice") {
            entityId = await Project.ReportView.fetchCommercialConditionsId(entityId);
            if (entityId == null)
                return;
        }

        if (reportName) {

            var strReportPath = `${SSRSProxyPath}?/CRM_MSCRM/${decodeURIComponent(reportName)}&rs:Command=Render&rs:Format=HTML5&rc:LinkTarget=_top&rc:Javascript=false&rc:Toolbar=false&id=${entityId}&rs:ClearSession=true`;
            var strExcelPath = `${SSRSProxyPath}?/CRM_MSCRM/${decodeURIComponent(reportName)}&rs:Command=Render&rs:Format=EXCELOPENXML&id=${entityId}&rs:ClearSession=true`;
            //var strReportPath = `https://crmrfrs.Project.local/ReportServer?/CRM_MSCRM/${decodeURIComponent(reportName)}&rs:Command=Render&rs:Format=HTML5&rc:LinkTarget=_top&rc:Javascript=false&rc:Toolbar=false&id=${entityId}&rs:ClearSession=true`;
            //var strExcelPath = `https://crmrfrs.Project.local/ReportServer?/CRM_MSCRM/${decodeURIComponent(reportName)}&rs:Command=Render&rs:Format=EXCELOPENXML&id=${entityId}&rs:ClearSession=true`;
            document.getElementById("reportData").setAttribute("src", strReportPath);
            document.getElementById("xlsxRef").setAttribute("href", strExcelPath);
        }

        //вариант 1 - через опубликованный отчет Продукты конкурентов c параметром ID (важно в опубликованных отчетах все представления должны быть через filteredview)
        //вариант 1 не работает на тестовой системе  (вероятно, из-за другого домена)
        //document.getElementById("reportData").setAttribute("src", 'http://castor/ReportServer?/CRM_MSCRM/Продукты конкурентов&rs:Command=Render&rs:Format=HTML5&rc:LinkTarget=_top&rc:Javascript=false&rc:Toolbar=false&id=' + entityId +'&rs:ClearSession=true');
        //document.getElementById("xlsxRef").setAttribute("href",'http://castor/ReportServer?/CRM_MSCRM/test&rs:Command=Render&rs:Format=EXCELOPENXML&number=2343&rs:ClearSession=true');
    }
}