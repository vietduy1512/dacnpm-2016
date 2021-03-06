/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect} from 'react';
import {View, StyleSheet, Image, Alert} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import axios from 'axios';
import {PARENT_ID, DEVICE_TOKEN} from 'constants/async-storage';
import Geolocation from '@react-native-community/geolocation';
import DeviceInfo from 'react-native-device-info';
import {AUTHENTICATE_TOKEN, APP_TYPE, EMERGENCY} from '../../../constants';
import HomeButton from '../../../components/buttons/ChildHomeButton';
import PushNotificationConfig from '../../../helpers/PushNotificationConfig';
import {AppInstalledChecker} from 'react-native-check-app-install';

const HomeScreen = ({navigation}) => {
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      try {
        initSession();
      } catch (error) {
        Alert.alert('Failed to init/save your current location');
        console.log(error);
      }
    });
    return unsubscribe;
  }, [navigation]);

  const initSession = async () => {
    try {
      // TODO: implement background task to update location
      let parentId = parseInt(await AsyncStorage.getItem(PARENT_ID), 10);
      let deviceToken = await AsyncStorage.getItem(DEVICE_TOKEN);
      if (parentId) {
        await axios.post('/users/initChild', {
          parentId: parentId,
          deviceToken: deviceToken,
        });
        saveCurrentChildPosition(parentId);
      } else {
        navigation.navigate(AUTHENTICATE_TOKEN);
      }
      // TODO handle deviceToken == null
    } catch (error) {
      console.log(error.message);
    }
  };

  const sendDeviceInfo = async () => {
    try {
      let deviceToken = await AsyncStorage.getItem(DEVICE_TOKEN);
      let battery = await DeviceInfo.getPowerState();

      const installedApps = [];
      const appList = AppInstalledChecker.getAppList();
      for (let i = 0; i < appList.length; i++) {
        let isInstalled = await AppInstalledChecker.isAppInstalled(appList[i]);
        if (isInstalled) installedApps.push(appList[i]);
      }

      await axios.post('/users/device-info', {
        battery: Math.round(battery.batteryLevel * 100),
        apps: installedApps,
        deviceToken,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const saveCurrentChildPosition = async parentId => {
    await sendDeviceInfo();
    Geolocation.watchPosition(
      async position => {
        await axios.post('/location/saveChildLocation', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          parentId: parentId,
        });
      },
      async error => console.log(error),
      {
        enableHighAccuracy: DeviceInfo.isEmulatorSync() ? true : false,
        timeout: 2000,
        maximumAge: 1000,
      },
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.main}>
        <HomeButton
          title="Emergency"
          image={require('assets/images/sos-icon.jpg')}
          onPress={() => navigation.navigate(EMERGENCY)}
        />
        <HomeButton
          title="Change app type"
          image={require('assets/images/switch-app-type.png')}
          onPress={() => navigation.navigate(APP_TYPE)}
        />
      </View>
      <Image style={styles.logo} source={require('assets/images/bg-1.jpg')} />
      <PushNotificationConfig />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  main: {
    zIndex: 1,
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  logo: {
    flex: 1,
    position: 'absolute',
    width: 450,
    height: 700,
    zIndex: -1,
  },
});
