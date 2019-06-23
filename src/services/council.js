'use strict';

const axios = require('axios');
const cheerio = require('cheerio')
const iso88515 = require('iso-8859-15');
const Council = require('../models').council;
const {SAPL_URL} = require('../helpers/constants');

const CouncilService = function () {
    const index = async (req, res) => {
        try {
            const councils = [];
            const response = await axios.request({
                method: 'GET',
                url: `${SAPL_URL}/consultas/parlamentar/parlamentar_index_html`,
                responseType: 'arraybuffer',
                responseEncoding: 'binary'
            });
            const htmlPage = iso88515.decode(response.data.toString('binary'));
            const $ = cheerio.load(htmlPage);

            $('#parlamentares > tbody > tr').each((i, elem) => {
                const council = {};
                council.civil_name = $(elem).children().eq(0).text().trim();
                council.name = $(elem).children().eq(1).text().trim();              
                council.party = $(elem).children().eq(2).text().trim();              
                council.active = ($(elem).children().eq(3).text().trim() === 'SIM');       
                council.code = ~~$(elem).children().first().children().attr('href').split('=')[1];  

                councils.push(council);
            });

            await Promise.all(councils.map(async (council) => {
                const response = await axios.request({
                    method: 'GET',
                    url: `${SAPL_URL}/consultas/parlamentar/parlamentar_mostrar_proc?cod_parlamentar=${council.code}`,
                    responseType: 'arraybuffer',
                    responseEncoding: 'binary'
                });
                const htmlPage = iso88515.decode(response.data.toString('binary'));
                const $ = cheerio.load(htmlPage);

                council.birthday = $('#texto-parlamentar > b:nth-child(5)').text().trim();
                council.phone = $('#texto-parlamentar > b:nth-child(7)').text().trim();
                council.email = $('#texto-parlamentar > b:nth-child(9) > a').text().trim();
            }));

            await Council.bulkCreate(councils);

            res.status(200).send({
                success: true
            });
        }

        catch (err) {
            res.status(400)
                .send({
                    message: err.message,
                    error: true
                });
        }
    };

    return {
        index
    }
};

module.exports = CouncilService;