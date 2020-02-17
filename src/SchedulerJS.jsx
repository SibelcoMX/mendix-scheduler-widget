import { Component, createElement } from "react";
import Scheduler, { SchedulerData, ViewTypes, CellUnits, AddMorePopover, DATE_FORMAT } from 'react-big-scheduler'
import 'react-big-scheduler/lib/css/style.css'
import moment from 'moment'
import withDragDropContext from './components/withDnDContext'
import "./ui/SchedulerJS.css";
import { PropTypes } from 'prop-types'
import Col from 'antd/lib/col'
import Row from 'antd/lib/row'
import Button from 'antd/lib/button'
import { restElement } from "@babel/types";
import "./components/MendixUtils";

class SchedulerJS extends Component {
    constructor(props) {
        super(props);

        // date and time settings

        moment.locale('en', {
            week: {
                dow: 1,
                doy: 4
            }
        });

        // create schedulerdata with settings

        let schedulerData = new SchedulerData(
            new moment(new Date()).format('YYYY-MM-DD'),
            ViewTypes.Week, false, false,
            {
                dayMaxEvents: this.props.maxEvents,
                weekMaxEvents: this.props.maxEvents,
                monthMaxEvents: this.props.maxEvents,
                quarterMaxEvents: this.props.maxEvents,
                yearMaxEvents: this.props.maxEvents,
                customMaxEvents: this.props.maxEvents,

                setMinuteStep: 30,
                schedulerWidth: '90%',
                nonAgendaDayCellHeaderFormat: 'HH:mm',
                views: [
                    { viewName: 'Day', viewType: ViewTypes.Day, showAgenda: false, isEventPerspective: false },
                    { viewName: '2 Days', viewType: ViewTypes.Custom, showAgenda: false, isEventPerspective: false },
                    { viewName: 'Week', viewType: ViewTypes.Week, showAgenda: false, isEventPerspective: false },
                    { viewName: '2 Weeks', viewType: ViewTypes.Custom1, showAgenda: false, isEventPerspective: false },
                    { viewName: 'Month', viewType: ViewTypes.Month, showAgenda: false, isEventPerspective: false }
                ]
            },
            {
                getCustomDateFunc: this.getCustomDate,
                isNonWorkingTimeFunc: this.isNonWorkingTime,
            },
            moment
        );

        this.state = {
            viewModel: schedulerData,
            resources: [],
            tasks: [],
            headerItem: undefined,
            left: 0,
            top: 0,
            height: 0,
            resourcesLoading: false,
            resourcesLoaded: false,
            tasksLoading: false,
            tasksLoaded: false,
            propertiesLoaded: false
        };
    }

    componentDidMount() {
        let schedulerData = this.state.viewModel;

        this.setResources(schedulerData);
        this.setTasks(schedulerData);
    }

    setColumnWidths(schedulerData) {
        const { localeMoment } = schedulerData;
        let dividerDay = (60 / parseInt(this.props.minuteStep.value));

        let showedStartDay = (localeMoment(this.props.workStartTime.value).hour() === 0 ? 0 : localeMoment(this.props.workStartTime.value).hour() - 1);
        let showedStopDay = (localeMoment(this.props.workEndTime.value).hour() === 23 ? 23 : localeMoment(this.props.workEndTime.value).hour() + 1);

        schedulerData.config.dayStartFrom = showedStartDay;
        schedulerData.config.dayStopTo = showedStopDay;
        let cellWidthDay = ((showedStopDay - showedStartDay) + 1);

        schedulerData.config.dayCellWidth = ((90 / cellWidthDay) / dividerDay) + '%';

        return schedulerData;
    }

    componentDidUpdate(prevProps) {
        if (prevProps !== this.props) {
            // checken of er nog properties aan het laden zijn of eventueel leeg zijn
            const propertiesLoaded = this.state.propertiesLoaded;
            if (propertiesLoaded === false) {
                let allLoaded = true;
                let propertiesToCheck = ['startDate', 'endDate', 'planningArea', 'workStartTime', 'workEndTime', 'showWeekend',
                    'allowOutsideHoursPlanning', 'minuteStep', 'clickedTask', 'editPermission'];
                for (let i = 0; i < propertiesToCheck.length; i++) {
                    if ('this.props.' + propertiesToCheck[i].status !== 'unavailable' && propertiesToCheck[i].status !== 'available') {
                        allLoaded = false;
                    }
                }
                this.debug(allLoaded);
                if (allLoaded) {
                    this.setState({
                        propertiesLoaded: allLoaded
                    });
                }
            }

            let schedulerData = this.state.viewModel;

            let needStateSet = false;
            let needResourcesSet = false;
            let needTasksSet = false;

            // check if planningarea has changed

            if (prevProps.planningArea.value !== this.props.planningArea.value) {
                schedulerData._createHeaders();
                needResourcesSet = true;
                needTasksSet = true;
                needStateSet = true;
            }

            // check if startDate or endDate is changed

            if (prevProps.startDate.value !== this.props.startDate.value || prevProps.endDate.value !== this.props.endDate.value) {
                needTasksSet = true;
                needStateSet = true;
            }

            // check if a task has been handled by the clickevent, and changes are made in the mendix database

            if (prevProps.clickedTask !== this.props.clickedTask && this.props.clickedTask === ' ') {
                needTasksSet = true;
                needStateSet = true;
            }

            // check if something needs to be reloaded and if the state needs to be updated

            if (needResourcesSet === true) {
                this.setResources(schedulerData);
            }

            if (needTasksSet === true) {
                this.setTasks(schedulerData);
            }

            if (needStateSet === true) {
                this.setState({
                    viewModel: schedulerData
                });
            }
        }
    }

    setResources = (schedulerData) => {
        let resourcesLoading = this.state.resourcesLoading;
        if (resourcesLoading === false) {
            this.setState({
                resourcesLoading: true
            });
            executeMicroflow(this.props.resourceSource)
                .then((mxObjects) => {
                    var resources = [];
                    this.debug("Received resources", mxObjects.length);
                    mxObjects.forEach(resource =>
                        resources.push({
                            id: resource.get("ResourceID"),
                            name: resource.get("Name"),
                            groupOnly: resource.get("GroupOnly"),
                            parentId: resource.get("ParentID")
                        })
                    );
                    schedulerData.setResources(resources);
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

    setTasks = (schedulerData) => {
        let tasksLoading = this.state.tasksLoading;
        if (tasksLoading === false) {
            let progressId = showProgress("Loading operations...", true);
            this.setState({
                tasksLoading: true
            });
            executeMicroflow(this.props.taskSource)
                .then((mxObjects) => {
                    var tasks = [];
                    this.debug("Received tasks", mxObjects.length);
                    mxObjects.forEach(task =>
                        tasks.push({
                            id: task.get("TaskID"),
                            title: task.get("Title"),
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
                            operationNumber: task.get("OperationNumber"),
                            employeeNumber: task.get("EmployeeNumber"),
                            operationID: task.get("OperationID")
                        })
                    );
                    schedulerData.setEvents(tasks);
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
        }
    }

    updateTask(event, startDate, endDate, oldSlotId, newSlotId) {
        const schedulerData = this.state.viewModel;
        this.debug(event);
        createObject('PMScheduler.Task')
            .then((task) => {
                task.set('TaskID', event.id);
                task.set("Title", event.title);
                task.set("Description", event.description);
                task.set("BgColor", event.bgColor);
                task.set('StartDate', moment(startDate, 'YYYY-MM-DD HH:mm:ss').toDate());
                task.set('EndDate', moment(endDate, 'YYYY-MM-DD HH:mm:ss').toDate());
                task.set('IsVacation', event.isVacation);
                task.set('ResourceId', newSlotId);
                task.set('OrderNumber', event.orderNumber);
                task.set('OperationNumber', event.operationNumber);
                task.set('OperationID', event.operationID);
                if (newSlotId.startsWith('r')) {
                    task.set('EmployeeNumber', newSlotId.substr(1))
                }
                commitObject(task)
                    .then(() => {
                        this.setState({
                            viewModel: schedulerData
                        });
                    })
                    .catch(error => {
                        showMendixError('newEvent, commitObject', error);
                    })
            })
            .catch(error => {
                showMendixError('newEvent, createObject', error);
            });
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
        if (viewType === ViewTypes.Custom1) {
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
                                </span>
                            ) : (
                                    <span />
                                )}

                        </Col>
                    </Row>
                </div>
            );
        }
    }

    prevClick = (schedulerData) => {
        schedulerData.prev();
        this.setDateRange(schedulerData.startDate, schedulerData.endDate);
    }

    nextClick = (schedulerData) => {
        schedulerData.next();
        this.setDateRange(schedulerData.startDate, schedulerData.endDate);
    }

    onViewChange = (schedulerData, view) => {
        schedulerData.setViewType(view.viewType, view.showAgenda, view.isEventPerspective);
        this.setTasks(schedulerData);
        this.setDateRange(schedulerData.startDate, schedulerData.endDate);
    }

    onSelectDate = (schedulerData, date) => {
        schedulerData.setDate(date);
        this.setTasks(schedulerData);
    }

    eventClicked = (schedulerData, event) => {
        if (this.props.editPermission.value === true) {
            let title = new String;
            let microflow = new String();
            if (event.title === this.props.vacationTitle) {
                title = this.props.vacationTitle;
                microflow = this.props.vacationClick;
            }
            else {
                title = 'Task';
                microflow = this.props.taskClick;
            }
            askConfirmation(`Do you want to edit operation "${title}"?`)
                .then(proceed => {
                    if (proceed) {
                        this.props.clickedTask.setValue(event.id);
                        executeMicroflow(microflow);
                    }
                });
        }
        else {
            showWarning('You do not have permission to edit an operation.');
        }
    };


    // render the scheduler and pass all functions to the scheduler component
    render() {
        const { viewModel } = this.state;
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
                    conflictOccurred={this.conflictOccurred}
                    onSetAddMoreState={this.onSetAddMoreState}
                    toggleExpandFunc={this.toggleExpandFunc}
                    newEvent={this.newEvent}
                />
                {popover}
            </div>
        )
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

    openSAP = (schedulerData, event) => {
        showWarning(`Show in SAP: {id: ${event.id}, title: ${event.title}}`);
    };

    // functions to help other functions

    // set the dates for the scheduler to load required data for those days

    setDateRange(start, end) {
        this.props.startDate.setValue((moment(start, 'YYYY-MM-DD').toDate()));
        this.props.endDate.setValue((moment(end, 'YYYY-MM-DD').toDate()));
    }

    // function to calculate the difference between start and end of a Task, result in hours

    calculateDuration(start, end) {
        let duration = moment.duration(end.diff(start));
        return duration.asHours();
    }

    updateEventStart = (schedulerData, event, newStart) => {
        let newEvent = {
            id: event.id,
            start: newStart
        };
        if (this.checkIfStartEventIsValid(schedulerData, newEvent) === true) {
            if (this.checkConflictOccurred(schedulerData, event, newStart, event.end, event.resourceId) === false) {
                schedulerData.updateEventStart(event, newStart);
                this.updateTask(event, schedulerData.localeMoment(newStart), schedulerData.localeMoment(event.end), event.resourceId, event.resourceId);
            }
        }
        else {
            showWarning('Not allowed to plan outside working hours.');
        }
        this.setState({
            viewModel: schedulerData
        })
    }

    updateEventEnd = (schedulerData, event, newEnd) => {
        if (this.checkConflictOccurred(schedulerData, event, event.start, newEnd, event.resourceId) === false) {
            schedulerData.updateEventEnd(event, newEnd);
            this.updateTask(event, schedulerData.localeMoment(event.start), schedulerData.localeMoment(newEnd), event.resourceId, event.resourceId);
        }
        this.setState({
            viewModel: schedulerData
        })
    }

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

    moveEvent = (schedulerData, event, slotId, slotName, start, end) => {
        let newEvent = {
            id: event.id,
            start: start
        };
        if (event.isVacation === false) {
            if (this.checkIfStartEventIsValid(schedulerData, newEvent) === true) {
                if (this.checkConflictOccurred(schedulerData, event, start, end, slotId) === false) {
                    schedulerData.moveEvent(event, slotId, slotName, start, end);
                    this.updateTask(event, start, end, event.resourceId, slotId);
                    this.setState({
                        viewModel: schedulerData
                    });
                }
                else {
                    this.setState({
                        viewModel: schedulerData
                    });
                }
            }
            else {
                showWarning('Not allowed to plan outside working hours.');
            }
        }
    }

    onScrollTop = (schedulerData, schedulerContent, maxScrollTop) => {
        this.debug('onScrollTop');
    }

    onScrollBottom = (schedulerData, schedulerContent, maxScrollTop) => {
        this.debug('onScrollBottom');
    }

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
                        if (startMoment <= eEnd && endMoment >= eStart) {
                            hasConflict = true;
                            showWarning('This situation leeds to overlapping.')
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
                                createObject('PMScheduler.Task')
                                    .then((mxObject) => {
                                        mxObject.set('TaskID', mxObject.getGuid());
                                        mxObject.set('Title', this.props.vacationTitle);
                                        let dayStartHour = localeMoment(this.props.workStartTime.value).hour();
                                        let dayEndHour = localeMoment(this.props.workEndTime.value).hour() + 1;
                                        if (schedulerData.viewType === ViewTypes.Day || schedulerData.viewType === ViewTypes.Custom) {
                                            mxObject.set('StartDate', moment(start, 'YYYY-MM-DD HH:mm:ss').toDate());
                                        } else {
                                            mxObject.set('StartDate', moment(start, 'YYYY-MM-DD HH:mm:ss').startOf('day').add(dayStartHour, 'hours').toDate());
                                        }
                                        mxObject.set('EndDate', moment(end, 'YYYY-MM-DD HH:mm:ss').startOf('day').add(dayEndHour, 'hours').toDate());
                                        mxObject.set('BgColor', 'black');
                                        mxObject.set('Resizable', true);
                                        mxObject.set('StartResizable', true);
                                        mxObject.set('EndResizable', true);
                                        mxObject.set('Movable', false);
                                        mxObject.set('IsVacation', true);
                                        mxObject.set('ResourceId', slotId);

                                        commitObject(mxObject)
                                            .then(() => {
                                                this.setState({
                                                    viewModel: schedulerData
                                                });
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

    debug = (...args) => {
        if (window.logger) {
            window.logger.debug(...args);
        }
    }
}

export default withDragDropContext(SchedulerJS); 