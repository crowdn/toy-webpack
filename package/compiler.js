const fs = require('fs');
const Parser = require('./parser');
const path = require('path');
class Compiler {
  constructor(options) {
    // webpack 配置
    const { entry, output } = options;
    // 入口
    this.entry = entry;
    // 出口
    this.output = output;
    // 模块
    this.modules = [];

    this.loaders = [];
    if (options.module?.rules) {
      this.loaders = options.module?.rules
        .filter((rule) => !!rule.use)
        .map((rule) => {
          const normal = require(rule.use);
          return {
            path: rule.use,
            query: rule.test,
            pitch: rule.pitch,
            normal,
            raw: rule.raw,
            pitchExecuted: false,
            normalExecuted: true,
          };
        });
    }
  }
  run() {
    const info = this.build(this.entry);
    this.modules.push(info);
    this.modules.forEach(({ dependecies }) => {
      // 层序遍历，解析所有依赖
      if (dependecies) {
        for (const dependency in dependecies) {
          this.modules.push(this.build(dependecies[dependency]));
        }
      }
    });
    // 生成依赖关系图
    this.dependencyGraph = this.modules.reduce(
      (graph, item) => ({
        ...graph,
        // 使用文件路径作为每个模块的唯一标识符,保存对应模块的依赖对象和文件内容
        [item.filename]: { dependecies: item.dependecies, code: item.code },
      }),
      {}
    );
    this.generate(this.dependencyGraph);
  }

  /**
   * 构建一个文件的信息 依赖 、经过编译后的code
   * @param {文件路径 + 名字} filename
   */
  build(filename) {
    const { getDependecies, getCode } = Parser;
    const ast = this.parse(filename);
    const dependecies = getDependecies(ast, filename);
    const code = getCode(ast);
    return {
      // 文件路径,可以作为每个模块的唯一标识符
      filename,

      // 依赖对象,保存着依赖模块路径
      dependecies,

      // 文件内容
      code,
    };
  }

  // 根据文件类型，采用不同的loader
  parse(filename) {
    // 应该按照 loaders提供的匹配方式，采用不同的loader解析
    const activeLoader = this.loaders
      .reduce((loaders, loader) => {
        if (loader.query.test(filename)) loaders.push(loader);
        return loaders;
      }, [])
      .reverse();
    const { getAst, getAstWithContent } = Parser;

    if (activeLoader.length) {
      let content = fs.readFileSync(filename, 'utf-8');
      for (let loader of activeLoader) {
        const data = loader.pitch?.();
        loader.data = data;
      }

      for (let i = activeLoader.length - 1; i >= 0; i--) {
        const { normal, options } = activeLoader[i];
        content = normal(content, options);
      }

      return getAstWithContent(content);
    } else {
      return getAst(filename);
    }
  }

  // 用闭包的方式重写 require函数, 输出bundle
  generate(dependencyGraph) {
    const filePath = path.join(this.output.path, this.output.filename);
    const bundle = `(function(graph){
  function require(module){
    function localRequire(relativePath){
      return require(graph[module].dependecies[relativePath])
    }
    var exports = {};
    (function(require,exports,code){
      eval(code)
    })(localRequire,exports,graph[module].code);
    return exports;
  }
  require('${this.entry}');
})(${JSON.stringify(dependencyGraph)})`;
    if (!fs.existsSync(this.output.path)) {
      fs.mkdirSync(this.output.path);
    }
    // 把文件内容写入到文件系统
    fs.writeFileSync(filePath, bundle, { encoding: 'utf-8' });
  }
}
module.exports = Compiler;
