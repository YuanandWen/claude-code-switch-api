#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 配置文件路径
const SOURCES_CONFIG_PATH = path.join(require('os').homedir(), '.claude', 'claude-sources.json');
const SETTINGS_PATH = path.join(require('os').homedir(), '.claude', 'settings.json');

// 创建readline接口用于用户输入
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 读取配置文件
function readConfig(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`配置文件不存在: ${filePath}`);
            process.exit(1);
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`读取配置文件失败: ${error.message}`);
        process.exit(1);
    }
}

// 写入配置文件
function writeConfig(filePath, config) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    } catch (error) {
        console.error(`写入配置文件失败: ${error.message}`);
        process.exit(1);
    }
}

// 显示API源选择菜单
function showSourceMenu(sources) {
    console.log('\n=== Claude API源选择器 ===\n');
    console.log('可用的API源:\n');

    sources.forEach((source, index) => {
        console.log(`${index + 1}. ${source.name}`);
        console.log(`   描述: ${source.description}`);
        console.log(`   地址: ${source.env.ANTHROPIC_BASE_URL}`);

        // 显示模型信息
        if (source.models && source.models.length > 0) {
            console.log(`   可用模型: ${source.models.map(m => m.name).join(', ')}`);
        } else {
            console.log(`   默认模型: ${source.env.ANTHROPIC_DEFAULT_SONNET_MODEL || '未指定'}`);
        }
        console.log('');
    });

    console.log('0. 退出');
    console.log('请选择要使用的API源 (输入数字):');
}

// 显示模型选择菜单
function showModelMenu(sourceName, models) {
    console.log(`\n=== ${sourceName} - 模型选择 ===\n`);
    console.log('可用的模型:\n');

    models.forEach((model, index) => {
        console.log(`${index + 1}. ${model.name}`);
        console.log(`   ID: ${model.model_id}`);
        console.log(`   描述: ${model.description}`);
        console.log('');
    });

    console.log('请选择要使用的模型 (输入数字):');
}

// 创建问题包装器，支持Promise
function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// 更新settings.json
function updateSettings(selectedSource, selectedModel = null) {
    try {
        // 读取当前settings.json
        let settings;
        try {
            settings = readConfig(SETTINGS_PATH);
        } catch (error) {
            // 如果文件不存在，创建基本的settings结构
            settings = {
                "$schema": "https://json.schemastore.org/claude-code-settings.json",
                "env": {}
            };
        }

        // 设置基础环境变量
        settings.env = { ...selectedSource.env };

        // 如果选择了模型，设置模型相关环境变量
        if (selectedModel) {
            settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL = selectedModel.model_id;
            settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL = selectedModel.model_id;
            settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = selectedModel.model_id;
        }

        // 写回settings.json
        writeConfig(SETTINGS_PATH, settings);

        console.log(`\n已配置: ${selectedSource.name}`);
        console.log(`API地址: ${selectedSource.env.ANTHROPIC_BASE_URL}`);
        if (selectedModel) {
            console.log(`选择的模型: ${selectedModel.name} (${selectedModel.model_id})`);
        } else {
            console.log(`默认模型: ${selectedSource.env.ANTHROPIC_DEFAULT_SONNET_MODEL || '未指定'}`);
        }

    } catch (error) {
        console.error(`更新配置失败: ${error.message}`);
        process.exit(1);
    }
}

// 主函数 - 使用async/await
async function main() {
    // 检查命令行参数
    const args = process.argv.slice(2);

    // 如果提供了直接启动的参数，跳过选择直接启动
    if (args.length > 0) {
        // 直接启动claude，不进行选择
        const { spawn } = require('child_process');
        const claude = spawn('npx', ['win-claude-code@latest', ...args], {
            stdio: 'inherit',
            shell: true
        });

        claude.on('exit', (code) => {
            process.exit(code);
        });
        return;
    }

    // 读取API源配置
    const config = readConfig(SOURCES_CONFIG_PATH);

    if (!config.sources || config.sources.length === 0) {
        console.error('没有找到可用的API源配置');
        process.exit(1);
    }

    // 显示API源选择菜单
    showSourceMenu(config.sources);

    // 获取用户选择的API源
    const sourceAnswer = await question('> ');
    const sourceChoice = parseInt(sourceAnswer.trim());

    if (sourceChoice === 0) {
        console.log('已取消选择');
        rl.close();
        process.exit(0);
    }

    if (sourceChoice < 1 || sourceChoice > config.sources.length) {
        console.log('无效的选择');
        rl.close();
        process.exit(1);
    }

    const selectedSource = config.sources[sourceChoice - 1];

    // 检查是否需要模型选择
    if (selectedSource.models && selectedSource.models.length > 0) {
        if (selectedSource.models.length === 1) {
            // 只有一个模型，直接使用
            console.log(`\n自动选择唯一模型: ${selectedSource.models[0].name}`);
            updateSettings(selectedSource, selectedSource.models[0]);
        } else {
            // 多个模型，显示选择菜单
            showModelMenu(selectedSource.name, selectedSource.models);

            const modelAnswer = await question('> ');
            const modelChoice = parseInt(modelAnswer.trim());

            if (modelChoice < 1 || modelChoice > selectedSource.models.length) {
                console.log('无效的模型选择');
                rl.close();
                process.exit(1);
            }

            const selectedModel = selectedSource.models[modelChoice - 1];
            updateSettings(selectedSource, selectedModel);
        }
    } else {
        // 没有models配置，使用原有逻辑
        updateSettings(selectedSource);
    }

    rl.close();

    // 启动claude
    console.log('\n正在启动 Claude Code...\n');
    const { spawn } = require('child_process');
    const claude = spawn('npx', ['win-claude-code@latest'], {
        stdio: 'inherit',
        shell: true
    });

    claude.on('exit', (code) => {
        process.exit(code);
    });
}

// 运行主函数
main().catch(error => {
    console.error('程序执行出错:', error.message);
    rl.close();
    process.exit(1);
});
