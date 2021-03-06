const { translate, print, pureWithoutTitle } = require('../eazax/editor-main-util');
const ConfigManager = require('../common/config-manager');

/** εΎζ θ‘¨ */
const ICON_MAP = {
    'scene': 'π₯',
    'prefab': 'π ',
    'node': 'π²',
    'component': 'π§©',
    'property': 'π',
    'asset': 'π¦',
    'asset-info': 'π',
    'node-refs': 'π',
    'asset-refs': 'π',
};

/**
 * ζε°ζΊ
 */
const Printer = {

    /**
     * ζε°η»ζθ³ζ§εΆε°
     * @param {object} result 
     */
    printResult(result) {
        if (!result) {
            return;
        }
        const { printDetails, printFolding } = ConfigManager.get();
        // ζ εΏδ½
        const nodeRefs = [], assetRefs = [];
        let nodeRefsCount = 0, assetRefsCount = 0;
        // ιεεΌη¨δΏ‘ζ―
        for (let refs = result.refs, i = 0, l = refs.length; i < l; i++) {
            const ref = refs[i],
                type = ref.type,
                url = ref.url.replace('db://', '').replace('.meta', '');
            if (type === 'scene' || type === 'prefab') {
                // εΊζ―ζι’εΆδ½
                nodeRefs.push(`γγ${ICON_MAP[type]} [${translate(type)}] ${url}`);
                // θηΉεΌη¨
                for (let details = ref.refs, j = 0, l = details.length; j < l; j++) {
                    nodeRefsCount++;
                    // θ―¦ζ
                    if (printDetails) {
                        const detail = details[j];
                        let item = `γγγγ${ICON_MAP['node']} [${translate('node')}] ${detail.node}`;
                        if (detail.component) {
                            item += ` γβ γ${ICON_MAP['component']} [${translate('component')}] ${detail.component}`;
                        }
                        if (detail.property) {
                            item += ` γβ γ${ICON_MAP['property']} [${translate('property')}] ${detail.property}`;
                        }
                        nodeRefs.push(item);
                    }
                }
            } else {
                // θ΅ζΊεΌη¨
                assetRefsCount++;
                assetRefs.push(`γγ${ICON_MAP['asset']} [${translate(type)}] ${url}`);
            }
        }
        // η»θ£ζζ¬
        const texts = [];
        // εε²ηΊΏ
        texts.push(`${'- - '.repeat(36)}`);
        // εΊη‘δΏ‘ζ―
        texts.push(`${ICON_MAP['asset-info']} ${translate('asset-info')}`);
        texts.push(`γγ- ${translate('asset-type')}${result.type}`);
        texts.push(`γγ- ${translate('asset-uuid')}${result.uuid}`);
        texts.push(`γγ- ${translate('asset-url')}${result.url}`);
        texts.push(`γγ- ${translate('asset-path')}${result.path}`);
        // εε²ηΊΏ
        texts.push(`${'- - '.repeat(36)}`);
        // θηΉεΌη¨
        if (nodeRefs.length > 0) {
            texts.push(`${ICON_MAP['node-refs']} ${translate('node-refs')} x ${nodeRefsCount}`);
            for (let i = 0, l = nodeRefs.length; i < l; i++) {
                texts.push(nodeRefs[i]);
            }
        }
        // θ΅ζΊεΌη¨
        if (assetRefs.length > 0) {
            texts.push(`${ICON_MAP['asset-refs']} ${translate('asset-refs')} x ${assetRefsCount}`);
            for (let i = 0, l = assetRefs.length; i < l; i++) {
                texts.push(assetRefs[i]);
            }
        }
        // η»ε°Ύεε²ηΊΏ
        texts.push(`${'- - '.repeat(36)}`);
        // ζε°ε°ζ§εΆε°
        if (printFolding) {
            // εθ‘ζε°
            texts.unshift(`π ${translate('result')} >>>`);
            print('log', texts.join('\n'));
        } else {
            // ιθ‘ζε°
            print('log', translate('result'));
            for (let i = 0, l = texts.length; i < l; i++) {
                pureWithoutTitle(`γγ${texts[i]}`);
            }
        }
    },

};

module.exports = Printer;
