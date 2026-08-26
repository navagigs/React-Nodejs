import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {

    // Simulasi bertahap
    stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 200 },
        { duration: '3m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '2m', target: 0 },
    ],

    thresholds: {
        http_req_failed: [
            'rate<0.05'
        ],
        http_req_duration: [
            'p(95)<3000'
        ],
    },
};


export default function () {

    let url = 
    'https://ottaflo.primayasaeduka.com/';


    let payload = {
        username: 'D002',
        password: 'D002cd'
    };


    let params = {
        headers: {
            'Content-Type': 
            'application/x-www-form-urlencoded',
        },
    };


    let res = http.post(
        url,
        payload,
        params
    );


    check(res, {

        'status 200': (r) =>
            r.status === 200,

        'response < 3s': (r) =>
            r.timings.duration < 3000,

    });


    sleep(1);
}