sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/table/Table",
    "sap/ui/table/Column",
    "sap/ui/table/RowSettings",
    "sap/m/Text",
    "sap/m/MessageToast",
    "sap/m/OverflowToolbar",
    "sap/m/Button",
    "sap/m/ToolbarSpacer",
    "sap/m/Title",
  ],
  /**
   * @param {typeof sap.ui.core.mvc.Controller} Controller
   */
  function (
    Controller,
    JSONModel,
    Table,
    Column,
    RowSettings,
    Text,
    MessageToast,
    OverflowToolbar,
    Button,
    ToolbarSpacer,
    Title
  ) {
    "use strict";

    let _oViewModel = new JSONModel();
    let _oDataModel;
    let _oView;
    let _oTableContainer;
    let _sTemplateID;
    let _sUuidUpload;
    let _oFile;
    let _oFileUploader;
    let _oFilterBarContext;
    let _sDefferedId = new Date().getTime().toString();

    // upload url
    const _sUrlCheck = "/sap/opu/odata/sap/ZGLB_MASSUPLOAD_SRV/FileContentsSet";

    return Controller.extend("oup.otc.zotcpodupld.controller.Main", {
      onInit: function () {
        // view
        _oView = this.getView();

        // table
        _oTableContainer = _oView.byId("idWorkListTableContainer");

        // hide table
        _oTableContainer.setVisible(false);

        // odata model
        _oDataModel = this.getOwnerComponent().getModel();

        // file uploader
        _oFileUploader = _oView.byId("fileUploader");

        // apply content density mode to root view
        _oView.addStyleClass(this.getOwnerComponent().getContentDensityClass());

        // Model used to manipulate control states
        const oData = {
          messageType: "None",
          messageText: "Test",
          messageVisible: false,
          salesOrganizationVS: "None",
          fileUploadVS: "None",
          enableUpload: true,
          btnTestImport: false,
          btnImport: false,
        };

        // Set data to model
        _oViewModel.setData(oData);

        // set model to view
        _oView.setModel(_oViewModel, "oViewModel");

        // deferred group
        _oDataModel.setDeferredGroups(
          _oDataModel.getDeferredGroups().concat([_sDefferedId])
        );

        // create entry

        // Filter Bar - Form
        var oFilterBar = _oView.byId("idFilterBar");

        // create an entry of the Products collection with the specified properties and values
        _oFilterBarContext = _oDataModel.createEntry("/ZOTC_I_EBOOK_POD_IF", {
          properties: {
            SalesOrganization: "",
          },
        });

        // binding against this entity
        oFilterBar.setBindingContext(_oFilterBarContext);
      },

      /**
       * Getter for the resource bundle.
       * @public
       * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
       */
      getResourceBundle: function () {
        return this.getOwnerComponent().getModel("i18n").getResourceBundle();
      },

      onResetPress: function () {
        // clear value help status and file uploader file
        // sales org - value help
        _oViewModel.setProperty("/salesOrganizationVS", "None");

        // file uploader - value help
        _oViewModel.setProperty("/fileUploadVS", "None");

        // file uploader - value
        _oFileUploader.clear();

        // context path
        const sPath = _oFilterBarContext.getPath();

        // reset context
        _oDataModel.setProperty(`${sPath}/SalesOrganization`, "");

        // enable upload
        _oViewModel.setProperty("/enableUpload", true);
      },

      onFileChange: function (oEvent) {
        this._initMessageStrips();

        let oFiles = oEvent.getParameter("files");
        let oFileUploader = _oView.byId("fileUploader");

        if (oFiles.length !== 0) {
          // save file for deployment
          _oFile = oFiles[0];

          let sTemplateID = oFiles[0].name.substr(0, 3);

          // save globally
          _sTemplateID = sTemplateID;

          if (isNaN(sTemplateID, 10)) {
            const sMessage =
              "No template id found in the provided file name, kindly provide template id in the file name to understand the file type." +
              "\n\nSample file name with template id - 'XXX_FileName.csv'";

            _oViewModel.setProperty("/messageType", "Error");
            _oViewModel.setProperty("/messageText", sMessage);
            _oViewModel.setProperty("/messageVisible", true);

            // clear file uploader
            oFileUploader.clear();
          }
        }
      },

      onUploadPress: function () {
        try {
          // context path
          const sPath = _oFilterBarContext.getPath();

          // context values
          const sSalesOrg = _oDataModel.getProperty(
            `${sPath}/SalesOrganization`
          );

          let bSalesOrgValid = true;
          let bFileValid = true;
          let sFileName = _oFileUploader.getValue();

          if (!sSalesOrg) {
            bSalesOrgValid = false;
          }

          if (!sFileName) {
            bFileValid = false;
          }

          _oViewModel.setProperty(
            "/salesOrganizationVS",
            bSalesOrgValid ? "None" : "Error"
          );

          _oViewModel.setProperty(
            "/fileUploadVS",
            bFileValid ? "None" : "Error"
          );

          if (!bSalesOrgValid) {
            throw "validation failed!";
          }

          // trigger upload
          this._fnPost(sSalesOrg, sFileName);

          // disable upload
          _oViewModel.setProperty("/enableUpload", false);
        } catch (error) {
          MessageToast.show("Provide mandatory fields to upload");
        }
      },

      onPressTestImport: function () {
        this._loadResponseTable("TestImport");
      },

      onPressImport: function () {
        this._loadResponseTable("Import");
      },

      _initMessageStrips: function () {
        _oViewModel.setProperty("/messageType", "None");
        _oViewModel.setProperty("/messageText", "");
        _oViewModel.setProperty("/messageVisible", false);
      },

      _fnPost: function (sSalesOrg, sFileName) {
        // ajax setup
        jQuery.ajaxSetup({
          cache: false,
        });

        // remove file extension
        let sFileNameFormatted = sFileName.match(/([^\/]+)(?=\.\w+$)/)[0];

        // remove template id
        sFileNameFormatted = sFileNameFormatted.substr(4);

        // post request
        jQuery.ajax({
          url: _sUrlCheck,
          async: false,
          cache: false,
          contentType: _oFile.type,
          data: _oFile,
          type: "POST",
          processData: false,
          contentType: false,
          beforeSend: (xhr) => {
            xhr.setRequestHeader(
              "x-csrf-token",
              _oDataModel.getSecurityToken()
            );
            xhr.setRequestHeader("slug", `${_sTemplateID}|${sSalesOrg}`);
          },
          success: (oData) => {
            try {
              _sUuidUpload = oData.firstElementChild
                .getElementsByTagName("m:properties")[0]
                .getElementsByTagName("d:FileID")[0].innerHTML;

              this._loadResponseTable("InitialLoad");
            } catch (error) {
              MessageToast.show("Failed to read File ID!");
            }
          },
          error: (oError) => {
            try {
              const oParser = new DOMParser();
              const oXmlDoc = oParser.parseFromString(
                oError.responseText,
                "text/xml"
              );
              const sMessage = oXmlDoc.getElementsByTagName("message")[0]
                .innerHTML;

              _oViewModel.setProperty("/messageVisible", true);
              _oViewModel.setProperty("/messageType", "Error");
              _oViewModel.setProperty(
                "/messageText",
                `${sFileNameFormatted} - ${sMessage}`
              );
            } catch (error) {
              // un handled message
              MessageToast.show("File Upload Error!");
            }
          },
        });
      },

      _onPressDownloadBtn: function () {
        let sURL = `/sap/opu/odata/SAP/ZGLB_MASSUPLOAD_SRV/ExportResultSet(TemplateID='${_sTemplateID}',FileID=guid'${_sUuidUpload}')/$value`;
        sap.m.URLHelper.redirect(sURL);
      },

      _loadResponseTable: function (sAction) {
        return new Promise((resolve, reject) => {
          // destory the item present in the table container
          _oTableContainer.destroyItems();

          const fnSuccess = (oDataResponse) => {
            try {
              let aHeaderDataFields = oDataResponse.toHeader.results || [];
              let aItemDataFields = oDataResponse.toItem.results || [];
              let aTableProperties = [];
              let sStatusFieldProperty = "";
              let sMessageType = "None";
              let sMessageText = "Test";
              let bMessageVisible = true;

              //Overflow Toolbar
              var oOverflowToolbar = new OverflowToolbar({
                content: [
                  new Title({ text: "ITEMS (" + aItemDataFields.length + ")" }),
                  new ToolbarSpacer(),
                  new Button({
                    id: "idDownloadResultsBtn",
                    text: "Download",
                    icon: "sap-icon://excel-attachment",
                    enabled: false,
                    press: this._onPressDownloadBtn,
                  }),
                ],
              });

              // create new sap.ui.table.GridTable
              let oTable = new Table({
                visibleRowCountMode: "Auto",
                selectionMode: "None",
                minAutoRowCount: 8,
                extension: [oOverflowToolbar],
              }).addStyleClass("sapUiSmallMargin");

              // identify columns
              for (let [index, oData] of aHeaderDataFields.entries()) {
                // push to table property array
                aTableProperties.push({
                  property: `Field${index + 1}`,
                  label: oData.Name,
                });
              }

              // add columns to table
              for (let oData of aTableProperties) {
                // row highlight on test import
                // check for status field
                if (oData.label.toUpperCase() === "ZSTATUS") {
                  // save status field property to check errors found
                  sStatusFieldProperty = oData.property;

                  // status row setting for table
                  oTable.setRowSettingsTemplate(
                    new RowSettings({
                      highlight: `{${oData.property}}`,
                    })
                  );
                } else {
                  // value
                  let oControl = new Text({
                    text: `{${oData.property}}`,
                    wrapping: false,
                  });

                  // label
                  let oColumn = new Column({
                    autoResizable: true,
                    label: new Text({
                      text: oData.label,
                    }),
                    template: oControl,
                    width: "auto",
                    // width:
                    //   oData.label.toUpperCase() === "MESSAGE"
                    //     ? "45rem"
                    //     : "7.5rem",
                  });

                  // add column to table
                  oTable.addColumn(oColumn);
                }
              }

              const onAfterRendering = (_) => {
                let oTpc = null;
                if (sap.ui.table.TablePointerExtension) {
                  oTpc = new sap.ui.table.TablePointerExtension(oTable);
                } else {
                  oTpc = new sap.ui.table.extensions.Pointer(oTable);
                }
                const aColumns = oTable.getColumns();
                for (let i = aColumns.length; i >= 0; i--) {
                  oTpc.doAutoResizeColumn(i);
                }
              };

              // add event delegate for onafter rendering
              oTable.addEventDelegate({
                onAfterRendering,
              });

              // table model
              oTable.setModel(new JSONModel(aItemDataFields));

              // if no entries hide the table
              oTable.setVisible(aItemDataFields.length !== 0);

              // table binding
              let oBindingInfo = oTable.getBindingInfo("rows");
              oTable.bindRows(
                oBindingInfo || {
                  path: "/",
                }
              );

              // set visibility
              _oTableContainer.setVisible(true);

              // add item to aggregation
              _oTableContainer.addItem(oTable);

              let bEnableTestBtn = false;
              let bEnableImportBtn = false;

              if (sAction !== "Import") {
                this._bErrorFlag = false;
                let aErrorRowIndex = [];

                for (let [index, oData] of aItemDataFields.entries()) {
                  if (oData[sStatusFieldProperty] === "Error") {
                    this._bErrorFlag = true;
                    aErrorRowIndex.push(index + 1);
                  }
                }

                // errors found
                if (aErrorRowIndex.length !== 0) {
                  essageType = "Error";
                  let sErrorIndexs = aErrorRowIndex.join(", ");
                  sMessageText = `Kinldy fix the errors in below rows ${sErrorIndexs}.
                    
                                   Upload valid data to Test Import.`;

                  if (sAction === "TestImport") {
                    sMessageText = `Kinldy fix the errors in below rows ${sErrorIndexs}.
                      
                                 Re-run the Test import to ensure there are no errors before Import.`;
                  }

                  // enable test import button on success of file upload
                  bEnableTestBtn = sAction === "Import";
                  bEnableImportBtn = sAction === "Import";
                }

                // no errors found
                else {
                  if (aItemDataFields.length === 0) {
                    sMessageText =
                      "Your Application data is ready for import.\n\nPlease proceed to Test Import.";
                  } else {
                    sMessageText = `Your application data is ready for import will create ${aItemDataFields.length} new items.

                            Please proceed to Test Import.`;
                  }

                  if (sAction === "TestImport") {
                    if (aItemDataFields.length === 0) {
                      sMessageText =
                        "Test Import is successful.\n\nPlease proceed to Import.";
                    } else {
                      sMessageText = `Test Import is successful, Import will create ${aItemDataFields.length} new items.

                              Please proceed to Import.`;
                    }
                  }

                  // enable test import button on success of file upload
                  bEnableTestBtn = true;
                  bEnableImportBtn = sAction === "TestImport";
                }
              } else {
                sMessageType = "Success";
                sMessageText = "Application data is created successfully.";

                var oDownloadBtn = sap.ui
                  .getCore()
                  .byId("idDownloadResultsBtn");
                oDownloadBtn.setEnabled(true);
              }

              _oViewModel.setProperty("/messageType", sMessageType);
              _oViewModel.setProperty("/messageText", sMessageText);
              _oViewModel.setProperty("/messageVisible", bMessageVisible);
              _oViewModel.setProperty("/btnTestImport", bEnableTestBtn);
              _oViewModel.setProperty("/btnImport", bEnableImportBtn);

              // promise return
              resolve();
            } catch (error) {
              // error in loading file
              MessageToast.show("Error " + error);

              // promise return
              reject();
            }
          };

          const fnError = (oErrorResponse) => {
            // error in loading file
            MessageToast.show("Error in loading file");

            // clear error messages
            this.initMessageStrips();

            const oParser = new DOMParser();
            const oXmlDoc = oParser.parseFromString(
              oErrorResponse.responseText,
              "text/xml"
            );
            const sMessage = oXmlDoc.getElementsByTagName("message")[0]
              .innerHTML;

            _oViewModel.setProperty("/messageType", "Error");
            _oViewModel.setProperty("/messageText", sMessage);
            _oViewModel.setProperty("/messageVisible", true);

            // disable both buttons
            _oViewModel.setProperty("/btnTestImport", false);
            _oViewModel.setProperty("/btnImport", false);

            // promise return
            reject();
          };

          let sName = "";
          if (sAction !== "InitialLoad") {
            sName = sAction;
          }

          let sURL = `/ActionSet(TemplateID='${_sTemplateID}',FileID=guid'${_sUuidUpload}',Name='${sName}')`;

          // read the fields of aggregation level using OData in JSON model
          _oDataModel.read(sURL, {
            urlParameters: {
              $expand: "toHeader,toItem",
            },
            success: fnSuccess,
            error: fnError,
          });
        });
      },
    });
  }
);
