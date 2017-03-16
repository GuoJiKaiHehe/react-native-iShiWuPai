/**
 * Created by ljunb on 2017/3/15.
 * 首页->分类->食物列表
 */
import React, {Component} from 'react'
import {
    StyleSheet,
    View,
    Text,
    ListView,
    TouchableOpacity,
    Image,
    Animated,
    ScrollView,
    ActivityIndicator
} from 'react-native'
import {observer} from 'mobx-react/native'
import {observable, runInAction, reaction, action, computed} from 'mobx'
import Header from '../../components/AMHeader'
import Loading from '../../components/Loading'

class FoodsStore {
    @observable foods = []
    @observable page = 1
    @observable categoryId = 1
    @observable orderBy = 1
    @observable orderAsc = 0
    @observable isRefreshing = false
    @observable isFetching = false

    constructor(categoryId) {
        this.categoryId = categoryId
        this.fetchFoods()
    }

    @action
    fetchFoods = async() => {
        try {
            if (this.isRefreshing) {
                this.page = 1
                this.isFetching = false
            } else {
                this.isFetching = true
            }

            const result = await this._fetchDataFromUrl()
            runInAction(() => {
                this.isRefreshing = false
                this.isFetching = false
                if (this.page == 1) {
                    this.foods.replace(result)
                } else {
                    this.foods.splice(this.foods.length, 0, ...result);
                }
            })
        } catch (error) {
            this.isFetching = false
            this.isRefreshing = false
        }
    }

    _fetchDataFromUrl() {
        return new Promise((resolve, reject) => {
            const URL = `http://food.boohee.com/fb/v1/foods?kind=group&value=${this.categoryId}&order_by=${this.orderBy}&page=${this.page}&order_asc=${this.orderAsc}`

            fetch(URL).then(response => {
                if (response.status == 200) return response.json()
                return null
            }).then(responseData => {
                if (responseData) {
                    resolve(responseData.foods)
                } else {
                    reject('请求出错！')
                }
            }).catch(error => {
                reject('网络出错！')
            })
        })
    }
}

@observer
export default class Foods extends Component {
    state = {
        dataSource: new ListView.DataSource({
            rowHasChanged: (row1, row2) => row1 !== row2,
        }),
        sortTypes: []
    }

    foodsStore = new FoodsStore(this.props.category.id)

    componentDidMount() {
        reaction(
            () => this.foodsStore.page,
            () => this.foodsStore.fetchFoods()
        )
        this._fetchSortTypes()
    }

    _fetchSortTypes = async() => {
        const URL = 'http://food.boohee.com/fb/v1/foods/sort_types'
        try {
            const result = await fetch(URL).then(response => response.json())
            this.setState({sortTypes: result.types})
        } catch (error) {
            alert(`[Foods] fetch sort types error: ${error}`)
        }
    }

    _onBack = () => {
        const {onResetBarStyle, navigator} = this.props
        navigator.pop()
        onResetBarStyle && onResetBarStyle()
    }

    _onPressFoodItem = food => {
        alert(JSON.stringify(food))
    }

    _onSelectSortType = type => {
        this.foodsStore.orderBy = type.index
        if (this.foodsStore.page == 1) {
            this.foodsStore.fetchFoods()
        } else {
            this.foodsStore.page = 1
        }
    }

    _onChangeOrderAsc = orderAsc => {
        this.foodsStore.orderAsc = orderAsc
        if (this.foodsStore.page == 1) {
            this.foodsStore.fetchFoods()
        } else {
            this.foodsStore.page = 1
        }
    }

    _onSelectSubCategory = () => {
        alert('right')
    }

    _renderRightItem = () => {
        return (
            <TouchableOpacity
                activeOpacity={0.75}
                style={{flexDirection: 'row', alignItems: 'center'}}
                onPress={this._onSelectSubCategory}
            >
                <Text style={{color: 'gray', fontSize: 12, marginRight: 3}}>全部</Text>
                <Image source={require('../../resource/ic_food_ordering.png')} style={{width: 16, height: 16}}/>
            </TouchableOpacity>
        )
    }

    _renderRow = food => {
        return <FoodItem food={food} onPress={this._onPressFoodItem}/>
    }

    render() {
        const {category: {name}} = this.props
        const {foods} = this.foodsStore
        const {dataSource, sortTypes} = this.state

        return (
            <View style={{flex: 1, backgroundColor: gColors.background}}>
                <Header
                    title={name}
                    backAction={this._onBack}
                    style={{zIndex: 2}}
                    renderRightItem={this._renderRightItem}
                />
                <FoodSiftHandleView
                    sortTypes={sortTypes}
                    onSelectSortType={this._onSelectSortType}
                    onChangeOrderAsc={this._onChangeOrderAsc}
                />
                <ListView
                    style={{backgroundColor: 'rgba(220, 220, 220, 0.2)'}}
                    dataSource={dataSource.cloneWithRows(foods.slice(0))}
                    renderRow={this._renderRow}
                    enableEmptySections
                />
                <Loading isShow={this.foodsStore.isFetching}/>
            </View>
        )
    }
}

class FoodSiftHandleView extends Component {
    static propTypes = {
        sortTypes: React.PropTypes.array,
        onSelectSortType: React.PropTypes.func,
        onChangeOrderAsc: React.PropTypes.func
    }

    orderByModalYValue = new Animated.Value(0)

    state = {
        isShow: false,
        currentType: '常见',
        orderAsc: 1
    }

    show = () => {
        this.setState({isShow: true}, () => {
            Animated.timing(this.orderByModalYValue, {
                toValue: 1,
                duration: 250,
            }).start()
        })
    }

    _close = () => {
        Animated.timing(this.orderByModalYValue, {
            toValue: 0,
            duration: 250,
        }).start(() => this.setState({isShow: false}))
    }

    _onChangeOrderAsc = () => {
        const {orderAsc} = this.state
        const {onChangeOrderAsc} = this.props
        this.setState({orderAsc: orderAsc == 0 ? 1 : 0}, () => onChangeOrderAsc && onChangeOrderAsc(orderAsc))
    }

    _onPressSortTypeCell = type => {
        const {onSelectSortType} = this.props
        this.setState({currentType: type.name})
        Animated.timing(this.orderByModalYValue, {
            toValue: 0,
            duration: 250,
        }).start(() => {
            onSelectSortType && onSelectSortType(type)
            this.setState({isShow: false})
        })
    }

    _renderSortTypeCell = (type, key) => {
        const {sortTypes} = this.props
        const {currentType} = this.state
        const isLast = sortTypes.length - 1 == key
        const titleStyle = [{fontSize: 13, color: '#333'}]
        if (currentType == type.name) titleStyle.push({color: 'rgb(253,84,94)'})
        return (
            <TouchableOpacity
                key={`${type.name}-${key}`}
                activeOpacity={0.75}
                style={[styles.sortTypeItem, isLast && {width: gScreen.width}]}
                onPress={() => this._onPressSortTypeCell(type)}
            >
                <Text style={titleStyle}>{type.name}</Text>
            </TouchableOpacity>
        )
    }

    render() {
        const {sortTypes} = this.props
        const {isShow, currentType, orderAsc} = this.state
        const backgroundColor = this.orderByModalYValue.interpolate({
            inputRange: [0, 1],
            outputRange: ['transparent', 'rgba(1,1,1,0.3)']
        })

        const contentHeight = gScreen.height * 0.4
        const contentYPosition = this.orderByModalYValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-contentHeight, 0]
        })

        const orderAscSrc = orderAsc == 1 ? require('../../resource/ic_food_ordering_down.png') : require('../../resource/ic_food_ordering_up.png')
        const orderAscStr = orderAsc == 1 ? '由高到低' : '由低到高'

        return (
            <View style={{zIndex: 1}}>
                <View
                    style={[styles.siftWrapper, {zIndex: 1}, isShow && {borderBottomWidth: StyleSheet.hairlineWidth}]}>
                    <TouchableOpacity
                        activeOpacity={0.75}
                        style={styles.siftCell}
                        onPress={this.show}
                    >
                        <Text style={styles.orderByFont}>{currentType}</Text>
                        <Image
                            style={{width: 16, height: 16}}
                            source={require('../../resource/ic_food_ordering.png')}
                        />
                    </TouchableOpacity>
                    {currentType == '常见' ?
                        <View style={styles.siftCell}/> :
                        <TouchableOpacity
                            activeOpacity={0.75}
                            style={styles.siftCell}
                            onPress={this._onChangeOrderAsc}
                        >
                            <Text style={{color: 'rgb(253,84,94)', fontSize: 13}}>{orderAscStr}</Text>
                            <Image
                                style={{width: 16, height: 18}}
                                source={orderAscSrc}
                            />
                        </TouchableOpacity>
                    }
                </View>
                {isShow &&
                <Animated.View style={[styles.animatedCover, {backgroundColor}]}>
                    <TouchableOpacity activeOpacity={1} style={{flex: 1}} onPress={this._close}>
                        <Animated.View style={[styles.animatedContent, {top: contentYPosition, height: contentHeight}]}>
                            {sortTypes.length == 0 ?
                                <LoadingProgressView style={{height: contentHeight}}/> :
                                <ScrollView
                                    style={{backgroundColor: '#fff'}}
                                    contentContainerStyle={{flexDirection: 'row', flexWrap: 'wrap'}}
                                >
                                    {sortTypes.map(this._renderSortTypeCell) }
                                </ScrollView>
                            }
                        </Animated.View>
                    </TouchableOpacity>
                </Animated.View>
                }
            </View>
        )
    }
}

const LoadingProgressView = ({style}) => {
    return (
        <View style={[styles.loadingProgress, style]}>
            <ActivityIndicator/>
        </View>
    )
}

class FoodItem extends Component {
    static propsTypes = {
        food: React.PropTypes.object,
        onPress: React.PropTypes.func
    }

    _onPress = () => {
        const {onPress, food} = this.props
        onPress && onPress(food)
    }

    render() {
        const {food} = this.props
        let lightStyle = [styles.healthLight];
        if (food.health_light == 2) {
            lightStyle.push({backgroundColor: gColors.healthYellow})
        } else if (food.health_light == 3) {
            lightStyle.push({backgroundColor: gColors.healthRed})
        }
        return (
            <TouchableOpacity
                activeOpacity={0.75}
                style={styles.foodItem}
                onPress={this._onPress}
            >
                <Image
                    style={{width: 40, height: 40, marginHorizontal: 10, borderRadius: 4}}
                    source={{uri: food.thumb_image_url}}
                />
                <View style={styles.foodNameWrapper}>
                    <View style={{justifyContent: 'center'}}>
                        <Text style={{color: '#666', marginBottom: 5}}>{food.name}</Text>
                        <Text style={{color: 'red', fontSize: 13}}>
                            {food.calory}
                            <Text style={{color: '#666'}}> 千卡/{food.weight}克</Text>
                        </Text>
                    </View>
                    <View style={lightStyle}/>
                </View>
            </TouchableOpacity>
        )
    }
}

const styles = StyleSheet.create({
    foodItem: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    foodNameWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgb(194,194,198)',
        height: 60,
        width: gScreen.width - 60,
        paddingRight: 10
    },
    healthLight: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: gColors.healthGreen,
        marginRight: 0,
    },
    siftWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        backgroundColor: '#fff',
        height: gScreen.navBarHeight + 44,
        marginTop: -gScreen.navBarHeight,
        paddingTop: gScreen.navBarHeight,
        borderBottomColor: gColors.border
    },
    siftCell: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
    },
    orderByFont: {
        fontSize: 13,
        marginRight: 5
    },
    sortTypeItem: {
        borderBottomColor: gColors.border,
        borderBottomWidth: StyleSheet.hairlineWidth,
        height: 40,
        width: gScreen.width / 3,
        paddingLeft: 10,
        justifyContent: 'center'
    },
    loadingProgress: {
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    animatedCover: {
        position: 'absolute',
        top: 44,
        left: 0,
        right: 0,
        height: gScreen.height - gScreen.navBarHeight - 44,
    },
    animatedContent: {
        position: 'absolute',
        left: 0,
        right: 0,
    }
})