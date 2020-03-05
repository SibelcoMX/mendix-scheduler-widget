import { Component, createElement } from "react";
import Scheduler, { SchedulerData, ViewTypes, CellUnits, AddMorePopover, DATE_FORMAT } from 'react-big-scheduler'
import moment from 'moment'
import Col from 'antd/lib/col'
import Row from 'antd/lib/row'
import Button from 'antd/lib/button'
import withDragDropContext from './components/withDnDContext'
import "./components/MendixUtils";

import 'react-big-scheduler/lib/css/style.css'
import "./ui/SchedulerJS.css";

class SchedulerJS extends Component {
    constructor(props) {
        super(props);

        console.log('Constructor called');



        this.state = {
            viewModel: undefined,
            resources: [],
            tasks: [],
            headerItem: undefined,
            left: 0,
            top: 0,
            height: 0,
            resourcesLoading: false,
            tasksLoading: false,
        };
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

        let schedulerData = new SchedulerData(
            new moment(new Date()).format('YYYY-MM-DD'),
            ViewTypes.Week, false, false,
            {
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

                setMinuteStep: this.props.minuteStep,
                schedulerWidth: '90%',
                schedulerMaxHeight: this.props.schedulerMaxHeight,
                nonAgendaDayCellHeaderFormat: 'M/D|HH:mm',
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
                getDateLabelFunc: this.getDateLabel,
            },
            moment
        );

        this.setResources(schedulerData);
        this.setTasks(schedulerData);
    }

    componentDidUpdate(prevProps) {
        if (prevProps !== this.props) {

            let schedulerData = this.state.viewModel;

            let needStateSet = false;
            let needResourcesSet = false;
            let needTasksSet = false;

            // check if planningarea has changed

            if (prevProps.planningArea.value !== this.props.planningArea.value) {
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

    render() {
        const { viewModel } = this.state;
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
                        conflictOccurred={this.conflictOccurred}
                        onSetAddMoreState={this.onSetAddMoreState}
                        toggleExpandFunc={this.toggleExpandFunc}
                        newEvent={this.newEvent}
                    />
                    {popover}
                </div>
            )
        }
        else {
            return (<div></div>);
        }
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

    getDateLabel(schedulerData, viewType, startDate, endDate) {
        var start = schedulerData.localeMoment(startDate);
        var end = schedulerData.localeMoment(endDate);
        var dateLabel = start.format('MMM D, YYYY');

        if (viewType === ViewTypes.Week || start != end && (viewType === ViewTypes.Custom1 || viewType === ViewTypes.Custom2)) {
            dateLabel = start.format('MMM D') + '-' + end.format('D, YYYY');
            if (start.month() !== end.month()) dateLabel = start.format('MMM D') + '-' + end.format('MMM D, YYYY');
            if (start.year() !== end.year()) dateLabel = start.format('MMM D, YYYY') + '-' + end.format('MMM D, YYYY');
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
                    this.debug('Tasks: ', mxObjects);
                    mxObjects.forEach(task =>
                        tasks.push({
                            id: task.getGuid(),
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
                            employeeNumber: task.get("EmployeeNumber"),
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
        let minuteStep = this.props.minuteStep.value;
        let momentStartDate = moment(startDate, 'YYYY-MM-DD HH:mm:ss');
        let roundStartDate = Math.floor(momentStartDate.minute() / minuteStep) * minuteStep;
        let roundedStartDate = momentStartDate.minute(roundStartDate).second(0).toDate();
        let momentEndDate = moment(endDate, 'YYYY-MM-DD HH:mm:ss');
        let roundEndDate = Math.floor(momentEndDate.minute() / minuteStep) * minuteStep;
        let roundedEndDate = momentEndDate.minute(roundEndDate).second(0).toDate();
        getObject(event.id)
            .then((capacity) => {
                capacity.set('StartDate', roundedStartDate);
                capacity.set('EndDate', roundedEndDate);
                capacity.set('ResourceID', newSlotId);
                if (newSlotId.startsWith('r')) {
                    capacity.set('EmployeeNumber', newSlotId.substr(1))
                }
                else {
                    capacity.set('EmployeeNumber', '')
                }
                this.debug('capacity: ' + capacity);
                commitObject(capacity)
                    .then(() => {
                        this.debug('Capacity committed');
                        this.setState({
                            viewModel: schedulerData
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
        this.setDateRange(schedulerData);
    }

    nextClick = (schedulerData) => {
        schedulerData.next();
        this.setDateRange(schedulerData);
    }

    onViewChange = (schedulerData, view) => {
        schedulerData.setViewType(view.viewType, view.showAgenda, view.isEventPerspective);
        schedulerData.config.customCellWidth = view.viewType === ViewTypes.Custom ? '1%' : '6%';
        this.setDateRange(schedulerData);
    }

    onSelectDate = (schedulerData, date) => {
        schedulerData.setDate(date);
        this.setDateRange(schedulerData);
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
            this.props.clickedTask.setValue(event.id);
            executeMicroflow(microflow);
        }
        else {
            showWarning('You do not have permission to edit an operation.');
        }
    };

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

    // set the dates for the scheduler to load required data for those days

    setDateRange(schedulerData) {
        const {startDate, endDate} = schedulerData;
        this.props.startDate.setValue((moment(startDate, 'YYYY-MM-DD').toDate()));
        this.props.endDate.setValue((moment(endDate, 'YYYY-MM-DD').toDate()));
        this.setTasks(schedulerData);
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
        let currentDateTime = new moment();
        let hasConflict = false;

        if (startMoment < currentDateTime) {
            showWarning('No planning allowed in the past.');
            hasConflict = true;
        }

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
                    askConfirmation(`Do you want to add an unavailability for ${slotName}`)
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
                                        // let newEvent = {
                                        //     id: mxObject.getGuid(),
                                        //     title: this.props.vacationTitle,
                                        //     start: moment(start, 'YYYY-MM-DD HH:mm:ss').toDate(),
                                        //     end: moment(end, 'YYYY-MM-DD HH:mm:ss').toDate(),
                                        //     resourceId: slotId,
                                        //     bgColor: 'black',
                                        //     resizable: true,
                                        //     movable: true,
                                        //     startResizable: true,
                                        //     endResizable: true,
                                        // };
                                        commitObject(mxObject)
                                            .then(() => {
                                                // schedulerData.addEvent(newEvent);
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

    roundDate = (date, duration, method) => {
        return moment(Math[method]((+date) / (+duration)) * (+duration));
    }

    debug = (...args) => {
        if (window.logger) {
            window.logger.debug(...args);
        }
    }
}

export default withDragDropContext(SchedulerJS); 