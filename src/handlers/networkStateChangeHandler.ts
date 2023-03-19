// @ts-ignore
export const networkStateChangeHandler = (oldNetworkState: any, newNetworkState: any) => {
    const newUdp = Reflect.get(newNetworkState, 'udp');
    clearInterval(newUdp?.keepAliveInterval);
}
