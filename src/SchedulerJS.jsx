import { Component, createElement } from "react";
import Scheduler, { SchedulerData, ViewTypes, CellUnits, AddMorePopover, DATE_FORMAT } from 'react-big-scheduler'
import 'react-big-scheduler/lib/css/style.css'
import moment from 'moment'
import withDragDropContext from './components/withDnDContext'
import "./ui/SchedulerJS.css";
import { PropTypes, array } from 'prop-types'
import Col from 'antd/lib/col'
import Row from 'antd/lib/row'
import Button from 'antd/lib/button'
import { restElement } from "@babel/types";
import "./components/mendixUtils";
import { hot } from "react-hot-loader/root";
import { AutoComplete } from 'antd';
import "antd/dist/antd.css"; 

class SchedulerJS extends Component {
    constructor(props) {
        super(props);

        this.state = {
            viewModel: undefined,
            resources: undefined,
            tasks: undefined,
            headerItem: undefined,
            left: 0,
            top: 0,
            height: 0,
            resourcesLoading: false,
            tasksLoading: false,
            clickedOrder: undefined,
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        let needUpdate = true;
        if (this.props !== nextProps) {
            if (
                nextProps.planningArea.status !== 'available'
                || nextProps.editPermission.status !== 'available'
                || nextProps.workStartTime.status !== 'available'
                || nextProps.workEndTime.status !== 'available'
                || nextProps.showWeekend.status !== 'available'
                || nextProps.allowOutsideHoursPlanning.status !== 'available'
                || nextProps.minuteStep.status !== 'available'

            ) {
                needUpdate = false;
            }
        }

        if (this.state.tasks !== nextState.tasks) {
            needUpdate = true;
        }

        if (this.props.planningArea.value !== nextProps.planningArea.value) {
            // this.setState({
            //     tasks: undefined
            // })
            needUpdate = true;
        }

        console.log('reload??? ' + this.props.reloadTasksWidget.value);

        if (this.props.reloadTasksWidget.value !== nextProps.reloadTasksWidget.value && nextProps.reloadTasksWidget.value !== 0) {
            console.log('RELOAD VALUE:' + nextProps.reloadTasksWidget.value);
            // this.setState({
            //     tasks: undefined
            // });
            nextState.tasks = undefined;
            needUpdate = true;
        }

        return needUpdate;
    }

    render() {
        const { viewModel, tasks } = this.state;
        let searchField = <div />;
        if (tasks !== undefined) {
            const { Option } = AutoComplete;
            let map = new Map();
            const children = tasks.map(function(task) {
                if (!map.has(task.operationID)) {
                    map.set(task.operationID, true);
                    return(<Option key={task.operationIDb} value={task.operationID}>{task.subTitle}</Option>);
                }
            });
            searchField =
                <AutoComplete filterOption={true} optionFilterProp={"children"} allowClear style={{ width: 200 }} onSelect={this.handleSearch} placeholder="Search">
                    {children}
                </AutoComplete>
        }
        if (viewModel != undefined) {
            let popover = <div />;

            if (this.state.headerItem !== undefined) {
                if (this.props.editPermission.value === true) {
                    popover =
                        <AddMorePopover headerItem={this.state.headerItem}
                            eventItemClick={this.eventClicked}
                            viewEventClick={this.unplan}
                            viewEventText="Unplan"
                            schedulerData={viewModel}
                            closeAction={this.onSetAddMoreState}
                            left={this.state.left}
                            top={this.state.top}
                            height={this.state.height}
                            moveEvent={this.moveEvent}
                        />;
                }
                else {
                    popover =
                        <AddMorePopover headerItem={this.state.headerItem}
                            eventItemClick={this.eventClicked}
                            schedulerData={viewModel}
                            closeAction={this.onSetAddMoreState}
                            left={this.state.left}
                            top={this.state.top}
                            height={this.state.height}
                            moveEvent={this.moveEvent}
                        />;
                }
            }

            return (
                <div>
                    <Scheduler schedulerData={viewModel}
                        prevClick={this.prevClick}
                        nextClick={this.nextClick}
                        onSelectDate={this.onSelectDate}
                        onViewChange={this.onViewChange}
                        eventItemClick={this.eventClicked}
                        eventItemPopoverTemplateResolver={this.eventItemPopoverTemplateResolver}
                        viewEventText="Unplan"
                        viewEventClick={this.unplan}
                        updateEventStart={this.updateEventStart}
                        updateEventEnd={this.updateEventEnd}
                        moveEvent={this.moveEvent}
                        onScrollTop={this.onScrollTop}
                        onScrollBottom={this.onScrollBottom}
                        nonAgendaCellHeaderTemplateResolver={this.nonAgendaCellHeaderTemplateResolver}
                        checkConflictOccurred={this.checkConflictOccurred}
                        onSetAddMoreState={this.onSetAddMoreState}
                        toggleExpandFunc={this.toggleExpandFunc}
                        newEvent={this.newEvent}
                        eventItemTemplateResolver={this.eventItemTemplateResolver}
                        leftCustomHeader={searchField}
                    />
                    {popover}
                </div>
            )
        }
        else {
            return (<div></div>);
        }
    }

    componentDidMount() {

        // date and time settings

        moment.locale('en', {
            week: {
                dow: 1,
                doy: 4
            }
        });

        // create schedulerdata with settings

        const schedulerData = new SchedulerData(
            new moment(new Date()).format('YYYY-MM-DD'),
            ViewTypes.Week, false, false,
            {
                //unplannedSlotColor: '#DDDDDD',
                dayResourceTableWidth: '16%',
                weekResourceTableWidth: '16%',
                monthResourceTableWidth: '16%',
                customResourceTableWidth: '16%',

                dayCellWidth: '2%',
                weekCellWidth: '12%',
                monthCellWidth: '5%',
                customCellWidth: '6%',

                dayMaxEvents: this.props.maxEvents,
                weekMaxEvents: this.props.maxEvents,
                monthMaxEvents: this.props.maxEvents,
                quarterMaxEvents: this.props.maxEvents,
                yearMaxEvents: this.props.maxEvents,
                customMaxEvents: this.props.maxEvents,

                setMinuteStep: this.props.minuteStep.status === 'available' ? parseInt(this.props.minuteStep.value.substring(1)) : 30,
                schedulerWidth: '90%',
                schedulerMaxHeight: this.props.schedulerMaxHeight !== 0 ? this.props.schedulerMaxHeight : 600,
                nonAgendaDayCellHeaderFormat: 'D/M|HH:mm',
                nonAgendaOtherCellHeaderFormat: 'ddd D/M',
                views: [
                    { viewName: 'Day', viewType: ViewTypes.Day, showAgenda: false, isEventPerspective: false },
                    { viewName: '2 Days', viewType: ViewTypes.Custom, showAgenda: false, isEventPerspective: false },
                    { viewName: 'Week', viewType: ViewTypes.Week, showAgenda: false, isEventPerspective: false },
                    { viewName: '2 Weeks', viewType: ViewTypes.Custom1, showAgenda: false, isEventPerspective: false },
                    { viewName: 'Month', viewType: ViewTypes.Month, showAgenda: false, isEventPerspective: false }
                    // { viewName: 'Task View', viewType: ViewTypes.Week, showAgenda: false, isEventPerspective: true }
                ]
            },
            {
                getCustomDateFunc: this.getCustomDate,
                isNonWorkingTimeFunc: this.isNonWorkingTime,
                getDateLabelFunc: this.getDateLabel,
                getNonAgendaViewBodyCellBgColorFunc: this.getNonAgendaViewBodyCellBgColor
            },
            moment
        );

        this.setResources(schedulerData, true);
        this.setTasks(schedulerData, true);
    }

    getNonAgendaViewBodyCellBgColor = (schedulerData, slotId, header) => {
        const { config } = schedulerData;
        // this.debug('getNonAgendaViewBodyCellBgColor', slotId);
        // this.debug('getNonAgendaViewBodyCellBgColor', header);
        // if (slotId.startsWith('u') && slotId.length > 1 && !header.nonWorkingTime) {
        if (slotId.startsWith('u') && slotId.length > 1) {
            return config.groupOnlySlotColor;
        }
    }

    showWorkingHours = (schedulerData) => {
        const { localeMoment } = schedulerData;

        let dayStartFrom = (schedulerData.localeMoment(this.props.workStartTime.value).hour() === 0 ? 0 : localeMoment(this.props.workStartTime.value).hour() - 1);
        let dayStopTo = (schedulerData.localeMoment(this.props.workEndTime.value).hour() === 23 ? 23 : localeMoment(this.props.workEndTime.value).hour() + 1);
        schedulerData.config.dayStartFrom = dayStartFrom;
        schedulerData.config.dayStopTo = dayStopTo;
        return schedulerData;
    }

    // componentDidUpdate(prevProps) {

    //     if (prevProps !== this.props) {

    //         let schedulerData = this.state.viewModel;

    //         // check if planningarea has changed

    //         if (prevProps.planningArea.value !== this.props.planningArea.value && this.props.planningArea.value !== undefined) {
    //             this.setState({
    //                 tasks: undefined,
    //                 resources: undefined
    //             });
    //             this.setResources(schedulerData);
    //             this.setTasks(schedulerData);
    //             this.setState({
    //                 viewModel: schedulerData
    //             });
    //         }
    //     }
    // }

    componentDidUpdate(prevProps) {
        this.debug('componentDidUpdate');
        const { viewModel } = this.state;
        if (prevProps !== this.props) {
            this.debug('componentDidUpdate - props changed', prevProps, this.props);
            // check if planningarea has changed
            if (prevProps.planningArea.value !== this.props.planningArea.value && this.props.planningArea.value !== undefined) {

                this.setResources(viewModel, true);
                this.setTasks(viewModel, true);
                // this.setState({
                //     viewModel: viewModel
                // });
                this.debug('plant changed');
            } else if ((prevProps.reloadTasksWidget.value !== this.props.reloadTasksWidget.value) && this.props.reloadTasksWidget.status === 'available') {
                //this.reloadTasks(viewModel);
                // this.forceUpdate();

                this.setTasks(viewModel, true);
                this.debug('NEED RELOAD');
            }
        }
    }

    reloadTasks = (schedulerData) => {
        this.setState({
            tasks: undefined
        });
        this.setTasks(schedulerData);
    }

    handleSearch = (userInput) => {
        let schedulerData = this.state.viewModel;
        let event = this.state.tasks.find(function (task) { return task.operationID === userInput });
        // schedulerData.viewType = ViewTypes.Day;
        // schedulerData.cellUnit = CellUnits.Hour;
        schedulerData = this.showWorkingHours(schedulerData);
        schedulerData._createHeaders();
        // schedulerData._createRenderData();
        this.onSelectDate(schedulerData, event.start);
        this.eventClicked(schedulerData, event);
    }

    onSetAddMoreState = (newState) => {
        if (newState === undefined) {
            this.setState({
                headerItem: undefined,
                left: 0,
                top: 0,
                height: 0
            });
        }
        else {
            this.setState({
                ...newState,
            });
        }
    }

    eventItemTemplateResolver = (schedulerData, event, bgColor, isStart, isEnd, mustAddCssClass, mustBeHeight, agendaMaxEventWidth) => {
        let borderWidth = isStart ? '4' : '0';
        let borderColor = '#000', backgroundColor = '#80C5F6';
        let titleText = schedulerData.behaviors.getEventTextFunc(schedulerData, event);
        // if(!!event.type){
        //     borderColor = event.type == 1 ? 'rgba(0,139,236,1)' : (event.type == 3 ? 'rgba(245,60,43,1)' : '#999');
        //     backgroundColor = event.type == 1 ? '#80C5F6' : (event.type == 3 ? '#FA9E95' : '#D9D9D9');
        // }
        let divStyle = { borderLeft: borderWidth + 'px solid ' + borderColor, backgroundColor: bgColor, height: mustBeHeight };
        if (!!agendaMaxEventWidth)
            divStyle = { ...divStyle, maxWidth: agendaMaxEventWidth };

        return <div key={event.id} className={mustAddCssClass} style={divStyle}>
            <span style={{ marginLeft: '0px', lineHeight: `${mustBeHeight}px` }}>{titleText}</span>
        </div>;
    }

    nonAgendaCellHeaderTemplateResolver = (schedulerData, item, formattedDateItems, style) => {
        let datetime = schedulerData.localeMoment(item.time);
        let isCurrentDate = false;

        if (schedulerData.viewType === ViewTypes.Day || schedulerData.viewType === ViewTypes.Custom) {
            isCurrentDate = datetime.isSame(new Date(), 'hour');
        }
        else {
            isCurrentDate = datetime.isSame(new Date(), 'day');
        }

        if (isCurrentDate) {
            style.backgroundColor = '#118dea';
            style.color = 'white';
        }

        return (
            <th key={item.time} className={`header3-text`} style={style}>
                {
                    formattedDateItems.map((formattedItem, index) => (
                        <div key={index}
                            dangerouslySetInnerHTML={{ __html: formattedItem.replace(/[0-9]/g, '<b>$&</b>') }} />
                    ))
                }
            </th>
        );
    }

    getCustomDate = (schedulerData, num, date = undefined) => {
        const { viewType } = schedulerData;
        let selectDate = schedulerData.startDate;
        if (date != undefined)
            selectDate = date;

        let startDate = num === 0 ? selectDate :
            schedulerData.localeMoment(selectDate).add(1 * num, 'days').format(DATE_FORMAT),
            endDate = schedulerData.localeMoment(startDate).add(1, 'days').format(DATE_FORMAT),
            cellUnit = CellUnits.Hour;
        if (viewType === ViewTypes.Custom) {
            let today = schedulerData.localeMoment(selectDate).startOf('day').format(DATE_FORMAT);
            startDate = num === 0 ? today : schedulerData.localeMoment(today).add(1 * num, 'days').format(DATE_FORMAT);
            endDate = schedulerData.localeMoment(startDate).add(1, 'days').format(DATE_FORMAT);
            cellUnit = CellUnits.Hour;
        }
        else if (viewType === ViewTypes.Custom1) {
            let monday = schedulerData.localeMoment(selectDate).startOf('week').format(DATE_FORMAT);
            startDate = num === 0 ? monday : schedulerData.localeMoment(monday).add(1 * num, 'weeks').format(DATE_FORMAT);
            endDate = schedulerData.localeMoment(startDate).add(1, 'weeks').endOf('week').format(DATE_FORMAT);
            cellUnit = CellUnits.Day;
        } else if (viewType === ViewTypes.Custom2) {
            let firstDayOfMonth = schedulerData.localeMoment(selectDate).startOf('month').format(DATE_FORMAT);
            startDate = num === 0 ? firstDayOfMonth : schedulerData.localeMoment(firstDayOfMonth).add(2 * num, 'months').format(DATE_FORMAT);
            endDate = schedulerData.localeMoment(startDate).add(1, 'months').endOf('month').format(DATE_FORMAT);
            cellUnit = CellUnits.Day;
        }

        return {
            startDate,
            endDate,
            cellUnit
        };
    }

    getDateLabel(schedulerData, viewType, startDate, endDate) {
        var start = schedulerData.localeMoment(startDate);
        var end = schedulerData.localeMoment(endDate);
        var dateLabel = start.format('MMM D, YYYY');

        if (viewType === ViewTypes.Week || start != end && (viewType === ViewTypes.Custom1 || viewType === ViewTypes.Custom2)) {
            dateLabel = start.format('MMM D') + ' - ' + end.format('D, YYYY');
            if (start.month() !== end.month()) dateLabel = start.format('MMM D') + ' - ' + end.format('MMM D, YYYY');
            if (start.year() !== end.year()) dateLabel = start.format('MMM D, YYYY') + ' - ' + end.format('MMM D, YYYY');
        } else if (viewType === ViewTypes.Month) {
            dateLabel = start.format('MMMM YYYY');
        } else if (viewType === ViewTypes.Custom) {
            dateLabel = start.format('dddd, MMM D') + ' - ' + end.format('dddd, MMM D');
        }
        else { dateLabel = start.format('dddd, MMM D') }

        return dateLabel;
    };

    isNonWorkingTime = (schedulerData, time) => {
        const { localeMoment } = schedulerData;
        if (schedulerData.cellUnit === CellUnits.Hour) {
            let hour = localeMoment(time).hour();
            if (hour < localeMoment(this.props.workStartTime.value).hour() || hour > localeMoment(this.props.workEndTime.value).hour())
                return true;
        } else {
            let dayOfWeek = localeMoment(time).weekday();
            if (!this.props.showWeekend.value && (dayOfWeek === 5 || dayOfWeek === 6))
                return true;
        }

        return false;
    }

    eventItemPopoverTemplateResolver = (schedulerData, eventItem, title, start, end, statusColor) => {
        let dateFormat = schedulerData.config.eventItemPopoverDateFormat;

        if (title === this.props.vacationTitle) {
            return (
                <div style={{ width: '300px' }}>
                    <Row type="flex" align="middle">
                        <Col span={2}>
                            <div className="status-dot" style={{ backgroundColor: statusColor }} />
                        </Col>
                        <Col span={22} className="overflow-text">
                            <span className="header2-text" title={title}>{title}</span>
                        </Col>
                    </Row>
                    <Row type="flex" align="middle">
                        <Col span={2}>
                            <div />
                        </Col>
                        <Col span={22}>
                            <span className="header1-text">{start.format(dateFormat)}</span><span className="help-text" style={{ marginLeft: '8px' }}>{start.format('HH:mm')}</span><span className="header2-text" style={{ marginLeft: '8px' }}>-</span><span className="header1-text" style={{ marginLeft: '8px' }}>{end.format(dateFormat)}</span><span className="help-text" style={{ marginLeft: '8px' }}>{end.format('HH:mm')}</span>
                        </Col>
                    </Row>
                </div>
            );
        }

        else {
            let showButton = this.props.editPermission.value === true && eventItem.resourceId.startsWith('r');
            let descriptionArray = eventItem.description.split("|");

            return (
                <div style={{ width: '300px' }}>
                    <Row type="flex" align="middle">
                        <Col span={2}>
                            <div className="status-dot" style={{ backgroundColor: statusColor }} />
                        </Col>
                        <Col span={22} className="overflow-text">
                            <span className="header2-text" title={title}>{title}</span>
                        </Col>
                    </Row>
                    <Row type="flex" align="middle">
                        <Col span={2}>
                            <div />
                        </Col>
                        <Col span={22} className="overflow-text">
                            <span className="header2-text" title={eventItem.subTitle}>{eventItem.subTitle}</span>
                        </Col>
                    </Row>
                    <Row type="flex" align="middle">
                        <Col span={2}>
                            <div />
                        </Col>
                        <Col span={22}>
                            <span className="header1-text">{start.format('HH:mm')}</span><span className="help-text" style={{ marginLeft: '8px' }}>{start.format(dateFormat)}</span><span className="header2-text" style={{ marginLeft: '8px' }}>-</span><span className="header1-text" style={{ marginLeft: '8px' }}>{end.format('HH:mm')}</span><span className="help-text" style={{ marginLeft: '8px' }}>{end.format(dateFormat)}</span>
                        </Col>
                    </Row>
                    <Row type="flex" align="middle">
                        <Col span={2}>
                            <div />
                        </Col>
                        <Col span={22}>
                            {descriptionArray.map(function (description, index) {
                                return <span className="header2-text">{description}<br /></span>;
                            })}
                        </Col>
                    </Row>
                    <Row type="flex" align="middle">
                        <Col span={2}>
                            <div />
                        </Col>
                        <Col span={22}>
                            <div />
                        </Col>
                    </Row>
                    <Row type="flex" align="middle">
                        <Col span={2}>
                            <div />
                        </Col>
                        <Col span={22}>
                            {showButton ? (
                                <span>
                                    <Button onClick={() => { this.unplan(schedulerData, eventItem); }}>Unplan</Button>
                                    <Button onClick={() => { this.unplanAll(schedulerData, eventItem); }}>Unplan All</Button>
                                </span>
                            ) : (
                                    <span>
                                        <Button onClick={() => { this.unplanAll(schedulerData, eventItem); }}>Unplan All</Button>
                                    </span>
                                )}

                        </Col>
                    </Row>
                </div>
            );
        }
    }

    setResources = (schedulerData, forceReload = false) => {
        if (forceReload) {
            let resourcesLoading = this.state.resourcesLoading;
            if (resourcesLoading === false) {
                this.setState({
                    resourcesLoading: true
                });
                executeMicroflow(this.props.resourceSource)
                    .then((mxObjects) => {
                        var resources = [];
                        this.debug("Received resources", mxObjects.length);
                        mxObjects.forEach(resource => {
                            resources.push({
                                id: resource.get("ResourceID"),
                                name: resource.get("Name"),
                                groupOnly: resource.get("GroupOnly"),
                                parentId: resource.get("ParentID"),
                                isUnplan: resource.get("ResourceID").startsWith("u") ? true : false,
                            });
                        }
                        );
                        schedulerData.setResources(resources);
                        this.debug('setResources minuteStep', this.props.minuteStep);
                        schedulerData.setMinuteStep(this.props.minuteStep.status === 'available' ? parseInt(this.props.minuteStep.value.substring(1)) : 30);
                        this.setState({
                            viewModel: schedulerData,
                            resources: resources,
                            resourcesLoading: false
                        });
                    })
                    .catch(error => {
                        showMendixError(`setResources`, error);
                    });
            }
        }
        else {
            schedulerData.setResources(this.state.resources);
        }
    }

    setTasks = (schedulerData, forceReload = false) => {
        console.log('setTasks state full? ' + !!this.state.tasks);
        if (forceReload) {
            let tasksLoading = this.state.tasksLoading;
            if (tasksLoading === false) {
                let progressId = showProgress("Loading operations...", true);
                this.setState({
                    tasksLoading: true
                });
                // executeMicroflow(this.props.taskSourceSap)
                // .then(() => {
                executeMicroflow(this.props.taskSource)
                    .then((mxObjects) => {
                        var tasks = [];
                        this.debug("Received tasks", mxObjects.length);
                        mxObjects.forEach(task =>
                            tasks.push({
                                id: task.getGuid(),
                                title: task.get("Title"),
                                subTitle: task.get("OrderNumber") + '-' + task.get("OperationNumber"),
                                description: task.get('Description'),
                                start: task.get("StartDate"),
                                end: task.get("EndDate"),
                                bgColor: task.get("BgColor"),
                                showPopover: task.get("ShowTooltip"),
                                resizable: task.get("Resizable"),
                                startResizable: task.get("StartResizable"),
                                endResizable: task.get("EndResizable"),
                                movable: task.get("Movable"),
                                resourceId: task.get("ResourceID"),
                                isVacation: task.get("IsVacation"),
                                orderNumber: task.get("OrderNumber"),
                                employeeNumber: task.get("EmployeeNumber"),
                                operationID: task.get("OperationID"),
                                groupId: task.get("OrderNumber"),
                                groupName: task.get("OrderNumber")
                            })
                        );
                        schedulerData.setEvents(tasks);
                        this.debug('setTasks minuteStep', this.props.minuteStep);
                        schedulerData.setMinuteStep(this.props.minuteStep.status === 'available' ? parseInt(this.props.minuteStep.value.substring(1)) : 30);
                        this.setState({
                            viewModel: schedulerData,
                            tasks: tasks,
                            tasksLoading: false
                        });
                        hideProgress(progressId);
                    })
                    .then()
                    .catch(error => {
                        showMendixError(`setTasks`, error);
                    });
                // })
            }
        }
        else {
            schedulerData.setEvents(this.state.tasks);
            this.setState({
                viewModel: schedulerData,
            });
        }
    }

    updateTask(event, startDate, endDate, oldSlotId, newSlotId) {
        const schedulerData = this.state.viewModel;
        let minuteStep = parseInt(this.props.minuteStep.value.substring(1));
        let momentStartDate = moment(startDate, 'YYYY-MM-DD HH:mm:ss');
        let roundStartDate = Math.floor(momentStartDate.minute() / minuteStep) * minuteStep;
        let roundedStartDate = momentStartDate.minute(roundStartDate).second(0).toDate();
        let momentEndDate = moment(endDate, 'YYYY-MM-DD HH:mm:ss');
        let roundEndDate = Math.floor(momentEndDate.minute() / minuteStep) * minuteStep;
        let roundedEndDate = momentEndDate.minute(roundEndDate).second(0).toDate();
        this.debug('updateTask', minuteStep, momentStartDate, roundStartDate, roundedStartDate);
        getObject(event.id)
            .then((capacity) => {
                capacity.set('StartDate', roundedStartDate);
                capacity.set('EndDate', roundedEndDate);
                capacity.set('ResourceID', newSlotId);
                capacity.set('IsChanged', true)
                if (newSlotId.startsWith('r')) {
                    capacity.set('EmployeeNumber', newSlotId.substr(1))
                }
                else {
                    capacity.set('EmployeeNumber', '')
                }
                commitObject(capacity)
                    .then(() => {
                        let taskList = [...this.state.tasks];
                        let taskIndex = taskList.findIndex(x => x.id = event.id);
                        taskList[taskIndex].start = roundStartDate;
                        taskList[taskIndex].end = roundEndDate;
                        this.setState({
                            viewModel: schedulerData,
                            tasks: taskList
                        });
                    })
                    .catch(error => {
                        showMendixError('updateTask, commitObject', error);
                    })
            })
            .catch(error => {
                showMendixError('updateTask, getObject', error);
            });
    }


    prevClick = (schedulerData) => {
        schedulerData.prev();
        this.setTasks(schedulerData);
    }

    nextClick = (schedulerData) => {
        schedulerData.next();
        this.setTasks(schedulerData);
    }

    onViewChange = (schedulerData, view) => {
        schedulerData.setViewType(view.viewType, view.showAgenda, view.isEventPerspective);
        schedulerData.config.customCellWidth = view.viewType === ViewTypes.Custom ? '2%' : '6%';
        schedulerData = this.showWorkingHours(schedulerData);
        schedulerData._createHeaders();
        // schedulerData._createRenderData();
        this.setTasks(schedulerData);
    }

    onSelectDate = (schedulerData, date) => {
        schedulerData.setDate(date);
        schedulerData._createHeaders();
        // schedulerData = this.showWorkingHours(schedulerData);
        this.setTasks(schedulerData);
    }

    eventClicked = (schedulerData, event) => {
        if (this.props.editPermission.value) {
            getObject(event.id)
                .then((obj) => {
                    obj.set('UnderEdit', true)
                    commitObject(obj)
                        .then(() => {
                            executeMicroflow(this.props.taskClick);
                        });
                });
        }
        else {
            showWarning('You do not have permission to edit an operation.');
        }
    };

    // eventClicked = (schedulerData, event) => {
    //     if (this.props.editPermission.value) {
    //         let guids = new Array(event.id);
    //         this.debug('eventClicked', guids);
    //         executeMicroflowWithObjects(this.props.taskClick, guids);
    //     }
    //     else {
    //         showWarning('You do not have permission to edit an operation.');
    //     }
    // };

    // unplan a resource. the association will be set to the resource's parent, it's workcenter.
    unplan = (schedulerData, event) => {

        // check if the task is attached to a resource, otherwise it is allready attached tot a workcenter and should not be unplanned again
        if (event.resourceId.startsWith('r')) {
            if (event.movable === true) {

                // get workcenters from state
                let resources = [];
                resources = this.state.resources.map(function (res) {
                    return ({
                        id: res.id,
                        parentId: res.parentId
                    });
                });

                // find workcenter for this event
                function findParent(idResource) {
                    for (let i = 0; i < resources.length; i++) {
                        if (resources[i].id === idResource) {
                            return resources[i].parentId;
                        }
                    }
                }

                // find the parent workcenter of the resource, set reference to the workcenter in the UnPlanned section
                let workcenterId = findParent(event.resourceId);
                let newWorkcenterId = workcenterId.replace('w', 'u');
                schedulerData.moveEvent(event, newWorkcenterId, event.title, event.start, event.end);
                this.updateTask(event, schedulerData.localeMoment(event.start), schedulerData.localeMoment(event.end), event.resourceId, newWorkcenterId);
                this.setState({
                    viewModel: schedulerData
                })
            }
            else {
                showWarning('Operation "' + event.title + '" can not be moved');
            }
        }
    };

    unplanAll = (schedulerData, event) => {

        let events = this.findEvents(event);

        let processedEvents = [];

        let resources = [];
        resources = this.state.resources.map(function (res) {
            return ({
                id: res.id,
                parentId: res.parentId
            });
        });

        function findParent(idResource) {
            for (let i = 0; i < resources.length; i++) {
                if (resources[i].id === idResource) {
                    return resources[i].parentId;
                }
            }
        }

        events.map((event) => {
            if (event.resourceId.startsWith('r')) {
                let workcenterId = findParent(event.resourceId);
                let newWorkcenterId = workcenterId.replace('w', 'u');
                schedulerData.moveEvent(event, newWorkcenterId, event.title, event.start, event.end);
                processedEvents.push(event);
            }
        });

        this.setState({
            viewModel: schedulerData
        });

        if (processedEvents.length > 0) {
            let guids = processedEvents.map((event => {
                return event.id
            }));
            getObjects(guids)
                .then((capacities) => {
                    let commitList = [];
                    capacities.forEach((capacity) => {
                        capacity.set('IsChanged', true);
                        capacity.set('EmployeeNumber', '')
                        capacity.set('ResourceID', processedEvents[0].resourceId);
                        commitList.push(capacity);
                    })

                    commitObjects(commitList)
                        .then(() => {

                        })
                        .catch(error => {
                            showMendixError('unplanAll, commitObjects', error);
                        })
                })
                .catch(error => {
                    showMendixError('unplanAll, getObjects', error);
                });
        }
    };


    // function to check if the startTime of an event is allowed, returns a boolean

    checkIfStartEventIsValid(schedulerData, event) {
        const { localeMoment } = schedulerData;
        let dayOfWeek = localeMoment(event.start).weekday();
        let startHour = localeMoment(event.start).hour();
        let allowedStartHour = localeMoment(this.props.workStartTime.value).hour();
        let allowedEndHour = localeMoment(this.props.workEndTime.value).hour();
        if (this.props.allowOutsideHoursPlanning.value === true) {
            return true;
        }
        else {

            if (this.props.showWeekend.value === true && (startHour >= allowedStartHour && startHour <= allowedEndHour)) {
                return true;
            }
            else if ((dayOfWeek >= 0 && dayOfWeek <= 4) && startHour >= allowedStartHour && startHour <= allowedEndHour) {
                return true
            }
            else {
                return false;
            }
        }
    }

    checkIfEventIsValid(schedulerData, event) {
        const { localeMoment } = schedulerData;
        let dayOfWeek = localeMoment(event.start).weekday();
        let startHour = localeMoment(event.start).hour();
        let endHour = localeMoment(event.end).hour();
        let allowedStartHour = localeMoment(this.props.workStartTime.value).hour();
        let allowedEndHour = localeMoment(this.props.workEndTime.value).hour();
        if (this.props.allowOutsideHoursPlanning.value === true) {
            return true;
        }
        else {
            function checkEndTime(end, allowedEnd) {
                if (end > allowedEnd) {
                    alert('This operation will be finnished outside working hours.')
                }
            }


            //if (this.props.showWeekend.value === true && startHour >= allowedStartHour && startHour <= allowedEndHour && endHour >= allowedStartHour && endHour <= allowedEndHour) {
            if (this.props.showWeekend.value === true && startHour >= allowedStartHour && startHour <= allowedEndHour) {
                checkEndTime(endHour, allowedEndHour);
                return true;
            }
            //else if (dayOfWeek >= 0 && dayOfWeek <= 4 && startHour >= allowedStartHour && startHour <= allowedEndHour && endHour >= allowedStartHour && endHour <= allowedEndHour) {
            else if (dayOfWeek >= 0 && dayOfWeek <= 4 && startHour >= allowedStartHour && startHour <= allowedEndHour) {
                checkEndTime(endHour, allowedEndHour);
                return true
            }
            else {
                return false;
            }
        }
    }

    onScrollTop = (schedulerData, schedulerContent, maxScrollTop) => {
        this.debug('onScrollTop');
    }

    onScrollBottom = (schedulerData, schedulerContent, maxScrollTop) => {
        this.debug('onScrollBottom');
    }

    toggleExpandFunc = (schedulerData, slotId) => {
        schedulerData.toggleExpandStatus(slotId);
        this.setState({
            viewModel: schedulerData
        });
    }

    // check if a task move or expand gives a conflict with other tasks
    // this function checks the overlapping date/time, the resource where it will be attached to, and if it overlaps only with itselfs

    checkConflictOccurred(schedulerData, currentEvent, start, end, slotId) {
        const { localeMoment } = schedulerData;

        let startMoment = localeMoment(start)
        let endMoment = localeMoment(end);
        let hasConflict = false;

        if (!slotId.startsWith('u')) {
            let events = this.state.tasks.map(function (res) {
                return ({
                    id: res.id,
                    start: res.start,
                    end: res.end,
                    resourceId: res.resourceId
                });
            });

            events.forEach((event) => {
                if (currentEvent.id === event.id) {

                }
                else {
                    let eStart = localeMoment(event.start);
                    let eEnd = localeMoment(event.end);
                    if (event.resourceId === slotId) {
                        if (startMoment < eEnd && endMoment > eStart) {
                            hasConflict = true;
                        }
                    }
                }

            });
        }
        return hasConflict;
    }

    newEvent = (schedulerData, slotId, slotName, start, end, type, item) => {
        const { localeMoment } = schedulerData;
        if (slotId.startsWith('r')) {
            if (this.props.editPermission.value === true) {
                if (this.checkConflictOccurred(schedulerData, {}, start, end, slotId) === false) {
                    askConfirmation(`Do you want to add a ${this.props.vacationTitle} for ${slotName}`)
                        .then((proceed) => {
                            if (proceed) {
                                createObject('PMScheduler.Capacity')
                                    .then((mxObject) => {
                                        mxObject.set('Title', this.props.vacationTitle);
                                        mxObject.set('StartDate', moment(start, 'YYYY-MM-DD HH:mm:ss').toDate());
                                        mxObject.set('EndDate', moment(end, 'YYYY-MM-DD HH:mm:ss').toDate());
                                        mxObject.set('BgColor', 'black');
                                        mxObject.set('Resizable', true);
                                        mxObject.set('StartResizable', true);
                                        mxObject.set('EndResizable', true);
                                        mxObject.set('Movable', false);
                                        mxObject.set('IsVacation', true);
                                        mxObject.set('ResourceID', slotId);
                                        mxObject.set('EmployeeNumber', slotId.substring(1));
                                        mxObject.set('PlanningPlant', this.props.planningArea.value);
                                        let newEvent = {
                                            id: mxObject.getGuid(),
                                            title: this.props.vacationTitle,
                                            start: moment(start, 'YYYY-MM-DD HH:mm:ss').toDate(),
                                            end: moment(end, 'YYYY-MM-DD HH:mm:ss').toDate(),
                                            resourceId: slotId,
                                            bgColor: 'black',
                                            resizable: true,
                                            movable: true,
                                            startResizable: true,
                                            endResizable: true,
                                            groupId: this.props.vacationTitle,
                                            groupName: this.props.vacationTitle
                                        }
                                        commitObject(mxObject)
                                            .then(() => {
                                                schedulerData.addEvent(newEvent);
                                                this.setState(prevState => ({
                                                    tasks: [...prevState.tasks, newEvent],
                                                    viewModel: schedulerData
                                                }))

                                            })
                                            .catch(error => {
                                                showMendixError('newEvent, commitObject', error);
                                            })
                                    })
                                    .catch(error => {
                                        showMendixError('newEvent, createObject', error);
                                    });
                            }
                        });
                }
            }
            else {
                showWarning(`You are not allowed to create a ${this.props.vacationTitle}.`);
            }
        }
    }

    findEvents = (event) => {
        const tasks = this.state.tasks;
        let result = [];
        tasks.map(function (task) {
            if (task.operationID === event.operationID) {
                result.push(task);
            }
        });
        return result;
    }

    checkMultipleValid = (schedulerData, events, start, end) => {
        let valid = true;
        events.forEach((event) => {
            if (this.checkConflictOccurred(schedulerData, event, start, end, event.newSlotId !== undefined ? event.newSlotId : event.resourceId)) {
                valid = false;
            }
            if (!!events.find(x => x.resourceId === event.resourceId && x.id !== event.id && x.resourceId.startsWith('r'))) {
                valid = false;
                console.log('Possible overlap' + JSON.stringify(events.find(x => x.resourceId === event.resourceId && x.id !== event.id && x.resourceId.startsWith('r'))));
            }
        });

        return valid;
    }

    updateMultiple = (schedulerData, events, startDate, endDate) => {
        let minuteStep = parseInt(this.props.minuteStep.value.substring(1));
        let momentStartDate = moment(startDate, 'YYYY-MM-DD HH:mm:ss');
        let roundStartDate = Math.floor(momentStartDate.minute() / minuteStep) * minuteStep;
        let roundedStartDate = momentStartDate.minute(roundStartDate).second(0).toDate();
        let momentEndDate = moment(endDate, 'YYYY-MM-DD HH:mm:ss');
        let roundEndDate = Math.floor(momentEndDate.minute() / minuteStep) * minuteStep;
        let roundedEndDate = momentEndDate.minute(roundEndDate).second(0).toDate();
        this.debug('updateMultiple', minuteStep, momentStartDate, roundStartDate, roundedStartDate);
        let guids = events.map((event => {
            return event.id
        }));
        let taskList = [...this.state.tasks];
        events.forEach((event) => {
            schedulerData.moveEvent(event, event.resourceId, event.slotName, roundedStartDate, roundedEndDate);
            let taskIndex = taskList.findIndex(x => x.id = event.id);
            taskList[taskIndex].start = roundStartDate;
            taskList[taskIndex].end = roundEndDate;
        });
        this.setState({
            viewModel: schedulerData,
            tasks: taskList
        });
        getObjects(guids)
            .then((capacities) => {
                let commitList = [];
                capacities.forEach((capacity) => {
                    capacity.set('StartDate', roundedStartDate);
                    capacity.set('EndDate', roundedEndDate);
                    capacity.set('IsChanged', true);
                    let thisEvent = events.find(x => x.id === capacity.getGuid());
                    let newResourceId = thisEvent.resourceId;
                    capacity.set('ResourceID', newResourceId);
                    if (newResourceId.startsWith('r')) {
                        capacity.set('EmployeeNumber', newResourceId.substr(1))
                    }
                    else {
                        capacity.set('EmployeeNumber', '')
                    }
                    commitList.push(capacity);
                })

                commitObjects(commitList)
                    .then()
                    .catch(error => {
                        showMendixError('updateMultiple, commitObjects', error);
                    })
            })
            .catch(error => {
                showMendixError('updateMultiple, getObjects', error);
            });
    }

    moveEvent = (schedulerData, event, slotId, slotName, start, end) => {
        const { localeMoment } = schedulerData;

        let startMoment = localeMoment(start)
        let currentDateTime = new moment();
        console.log(startMoment + ' < ' + currentDateTime);
        if (!(startMoment < currentDateTime)) {
            let events = this.findEvents(event);
            let allUnplanned = true;
            for (let i = 0; i < events.length; i++) {
                if (!events[i].resourceId.startsWith('u') || !slotId.startsWith('u')) {
                    allUnplanned = false;
                }
            }
            if (allUnplanned) {
                this.updateMultiple(schedulerData, events, start, end);
            }
            else {
                let eventTocheck = {
                    id: event.id,
                    start: start,
                    end: end
                };
                if (this.checkIfEventIsValid(schedulerData, eventTocheck)) {
                    if (!this.checkConflictOccurred(schedulerData, event, start, end, slotId)) {
                        let currentEvent = events.find(x => x.id === event.id);
                        currentEvent.resourceId = slotId;
                        if (this.checkMultipleValid(schedulerData, events, start, end)) {
                            this.updateMultiple(schedulerData, events, start, end);
                        }
                        else {
                            showWarning(this.props.overlapMessage + '\n' + event.title);
                            this.setState({
                                viewModel: schedulerData
                            });
                        }
                    }
                    else {
                        showWarning(this.props.overlapMessage + '\n' + event.title);
                        this.setState({
                            viewModel: schedulerData
                        });
                    }
                }
                else {
                    showWarning('Not allowed to plan outside working hours.');
                    this.setState({
                        viewModel: schedulerData
                    })
                }
            }
        }
        else {
            showWarning('No planning allowed in the past.');
            this.setState({
                viewModel: schedulerData
            })
        }
    }

    updateEventStart = (schedulerData, event, newStart) => {
        const { localeMoment } = schedulerData;

        let startMoment = localeMoment(start)
        let currentDateTime = new moment();
        if (!startMoment < currentDateTime) {
            let newEvent = {
                id: event.id,
                start: newStart,
                end: event.end
            };
            let events = this.findEvents(event);
            if (this.checkIfEventIsValid(schedulerData, newEvent)) {
                if (this.checkMultipleValid(schedulerData, events, newStart, event.end)) {
                    this.updateMultiple(schedulerData, events, newStart, event.end);
                }
                else {
                    showWarning(this.props.overlapMessage + '\n' + event.title);
                }
            }
            else {
                showWarning('Not allowed to plan outside working hours.');
            }
            this.setState({
                viewModel: schedulerData
            })
        }
        else {
            showWarning('No planning allowed in the past.');
        }
    }

    updateEventEnd = (schedulerData, event, newEnd) => {
        const { localeMoment } = schedulerData;

        let startMoment = localeMoment(start)
        let currentDateTime = new moment();
        if (!startMoment < currentDateTime) {
            let newEvent = {
                id: event.id,
                start: event.start,
                end: newEnd
            };
            let events = this.findEvents(event);
            if (this.checkIfEventIsValid(schedulerData, newEvent)) {
                if (this.checkMultipleValid(schedulerData, events, event.start, newEnd)) {
                    this.updateMultiple(schedulerData, events, event.start, newEnd);
                }
                else {
                    showWarning(this.props.overlapMessage);
                }
            }
            else {
                showWarning('Not allowed to plan outside working hours.');
            }
            this.setState({
                viewModel: schedulerData
            })
        }
        else {
            showWarning('No planning allowed in the past.');
        }
    }

    debug = (...args) => {
        if (window.logger) {
            window.logger.debug(...args);
        }
    }
}

export default hot(withDragDropContext(SchedulerJS)); 